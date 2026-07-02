'use strict'

const spawk = require('spawk')
const t = require('tap')

// Stub which.sync so shell resolution returns the bare name, keeping the spawn()
// assertions stable; the trusted-PATH behaviour has its own tests below.
const promiseSpawn = t.mock('../lib/index.js', {
  which: { sync: (cmd) => cmd },
})

spawk.preventUnmatched()
t.afterEach(() => {
  spawk.clean()
})

t.test('sh', (t) => {
  t.test('runs in shell', async (t) => {
    const proc = spawk.spawn('sh', ['-c', 'echo hello'], { shell: false })
      .stdout(Buffer.from('hello\n'))

    const result = await promiseSpawn('echo', ['hello'], { shell: 'sh' })
    t.hasStrict(result, {
      code: 0,
      signal: undefined,
      stdout: 'hello',
      stderr: '',
    })

    t.ok(proc.called)
  })

  t.test('escapes arguments', async (t) => {
    const proc = spawk.spawn('sh', ['-c', 'echo \'hello world\''], { shell: false })
      .stdout(Buffer.from('hello\n'))

    const result = await promiseSpawn('echo', ['hello world'], { shell: 'sh' })
    t.hasStrict(result, {
      code: 0,
      signal: undefined,
      stdout: 'hello',
      stderr: '',
    })

    t.ok(proc.called)
  })

  t.end()
})

t.test('shell interpreter resolution', (t) => {
  t.test('resolves the shell from the ambient PATH, ignoring opts.env.PATH', async (t) => {
    const calls = []
    const promiseSpawnMock = t.mock('../lib/index.js', {
      which: {
        sync: (key, opts) => {
          calls.push({ key, opts })
          return '/usr/bin/sh'
        },
      },
    })

    const proc = spawk.spawn('/usr/bin/sh', ['-c', 'echo hello'], { shell: false })
      .stdout(Buffer.from('hello\n'))

    await promiseSpawnMock('echo', ['hello'], {
      shell: 'sh',
      env: { PATH: '/tmp/evil/node_modules/.bin' },
    })

    const shellCall = calls.find((c) => c.key === 'sh')
    t.ok(shellCall, 'resolved the shell interpreter')
    t.equal(shellCall.opts.path, process.env.PATH, 'used the ambient process PATH')
    t.equal(shellCall.opts.nothrow, true, 'resolved with nothrow')
    t.not(shellCall.opts.path, '/tmp/evil/node_modules/.bin',
      'did not resolve against the untrusted opts.env.PATH')
    t.ok(proc.called, 'spawned the resolved absolute shell path')
  })

  t.test('falls back to the bare shell name when not on the trusted PATH', async (t) => {
    const promiseSpawnMock = t.mock('../lib/index.js', {
      which: {
        sync: () => null,
      },
    })

    const proc = spawk.spawn('sh', ['-c', 'echo hello'], { shell: false })
      .stdout(Buffer.from('hello\n'))

    await promiseSpawnMock('echo', ['hello'], { shell: 'sh' })
    t.ok(proc.called, 'spawned the bare shell name as a fallback')
  })

  t.end()
})

t.test('cmd', (t) => {
  t.test('runs in shell', async (t) => {
    const proc = spawk.spawn('cmd.exe', ['/d', '/s', '/c', 'echo hello'], {
      shell: false,
      windowsVerbatimArguments: true,
    })
      .stdout(Buffer.from('hello\n'))

    const result = await promiseSpawn('echo', ['hello'], { shell: 'cmd.exe' })
    t.hasStrict(result, {
      code: 0,
      signal: undefined,
      stdout: 'hello',
      stderr: '',
    })

    t.ok(proc.called)
  })

  t.test('falls back to the bare initial cmd when it cannot be resolved', async (t) => {
    const promiseSpawnMock = t.mock('../lib/index.js', {
      which: {
        sync: (key) => {
          if (key === 'cmd.exe') {
            return key
          }
          throw new Error('not found')
        },
      },
    })

    const proc = spawk.spawn('cmd.exe', ['/d', '/s', '/c', 'nope hello'], {
      shell: false,
      windowsVerbatimArguments: true,
    })
      .stdout(Buffer.from('hello\n'))

    const result = await promiseSpawnMock('nope', ['hello'], { shell: 'cmd.exe' })
    t.hasStrict(result, {
      code: 0,
      signal: undefined,
      stdout: 'hello',
      stderr: '',
    })

    t.ok(proc.called)
  })

  t.test('works when initial cmd is wrapped in quotes', async (t) => {
    const proc = spawk.spawn('cmd.exe', ['/d', '/s', '/c', '"echo" hello'], {
      shell: false,
      windowsVerbatimArguments: true,
    })
      .stdout(Buffer.from('hello\n'))

    const result = await promiseSpawn('"echo"', ['hello'], { shell: 'cmd.exe' })
    t.hasStrict(result, {
      code: 0,
      signal: undefined,
      stdout: 'hello',
      stderr: '',
    })

    t.ok(proc.called)
  })

  t.test('works when initial cmd has a space and is wrapped in quotes', async (t) => {
    const proc = spawk.spawn('cmd.exe', ['/d', '/s', '/c', '"two words" hello'], {
      shell: false,
      windowsVerbatimArguments: true,
    })
      .stdout(Buffer.from('hello\n'))

    const result = await promiseSpawn('"two words"', ['hello'], { shell: 'cmd.exe' })
    t.hasStrict(result, {
      code: 0,
      signal: undefined,
      stdout: 'hello',
      stderr: '',
    })

    t.ok(proc.called)
  })

  t.test('works when initial cmd is more than one command', async (t) => {
    const proc = spawk.spawn('cmd.exe', ['/d', '/s', '/c', 'one two three hello'], {
      shell: false,
      windowsVerbatimArguments: true,
    })
      .stdout(Buffer.from('hello\n'))

    const result = await promiseSpawn('one two three', ['hello'], { shell: 'cmd.exe' })
    t.hasStrict(result, {
      code: 0,
      signal: undefined,
      stdout: 'hello',
      stderr: '',
    })

    t.ok(proc.called)
  })

  t.test('escapes when cmd is a .exe', async (t) => {
    const promiseSpawnMock = t.mock('../lib/index.js', {
      which: {
        sync: (key) => {
          if (key === 'cmd.exe') {
            return key
          }
          t.equal(key, 'dir')
          return 'dir.exe'
        },
      },
    })

    const proc = spawk.spawn('cmd.exe', ['/d', '/s', '/c', 'dir ^"with^ spaces^"'], {
      shell: false,
      windowsVerbatimArguments: true,
    })

    const result = await promiseSpawnMock('dir', ['with spaces'], { shell: 'cmd.exe' })
    t.hasStrict(result, {
      code: 0,
      signal: undefined,
      stdout: '',
      stderr: '',
    })

    t.ok(proc.called)
  })

  t.test('double escapes when cmd is a .cmd', async (t) => {
    const promiseSpawnMock = t.mock('../lib/index.js', {
      which: {
        sync: (key) => {
          if (key === 'cmd.exe') {
            return key
          }
          t.equal(key, 'dir')
          return 'dir.cmd'
        },
      },
    })

    const proc = spawk.spawn('cmd.exe', ['/d', '/s', '/c', 'dir ^^^"with^^^ spaces^^^"'], {
      shell: false,
      windowsVerbatimArguments: true,
    })

    const result = await promiseSpawnMock('dir', ['with spaces'], { shell: 'cmd.exe' })
    t.hasStrict(result, {
      code: 0,
      signal: undefined,
      stdout: '',
      stderr: '',
    })

    t.ok(proc.called)
  })

  t.test('which respects provided env PATH/PATHEXT', async (t) => {
    const PATH = 'C:\\Windows\\System32'
    const PATHEXT = 'EXE'

    const promiseSpawnMock = t.mock('../lib/index.js', {
      which: {
        sync: (key, opts) => {
          if (key === 'cmd.exe') {
            return key
          }
          t.equal(key, 'dir')
          t.equal(opts.path, PATH)
          t.equal(opts.pathext, PATHEXT)
          return 'dir.exe'
        },
      },
    })

    const proc = spawk.spawn('cmd.exe', ['/d', '/s', '/c', 'dir ^"with^ spaces^"'], {
      shell: false,
      windowsVerbatimArguments: true,
    })

    const result = await promiseSpawnMock('dir', ['with spaces'], {
      env: {
        PATH,
        PATHEXT,
      },
      shell: 'cmd.exe',
    })
    t.hasStrict(result, {
      code: 0,
      signal: undefined,
      stdout: '',
      stderr: '',
    })

    t.ok(proc.called)
  })

  t.test('which respects variant casing for provided env PATH/PATHEXT', async (t) => {
    const PATH = 'C:\\Windows\\System32'
    const PATHEXT = 'EXE'

    const promiseSpawnMock = t.mock('../lib/index.js', {
      which: {
        sync: (key, opts) => {
          if (key === 'cmd.exe') {
            return key
          }
          t.equal(key, 'dir')
          t.equal(opts.path, PATH)
          t.equal(opts.pathext, PATHEXT)
          return 'dir.exe'
        },
      },
    })

    const proc = spawk.spawn('cmd.exe', ['/d', '/s', '/c', 'dir ^"with^ spaces^"'], {
      shell: false,
      windowsVerbatimArguments: true,
    })

    const result = await promiseSpawnMock('dir', ['with spaces'], {
      env: {
        pAtH: PATH,
        pathEXT: PATHEXT,
      },
      shell: 'cmd.exe',
    })
    t.hasStrict(result, {
      code: 0,
      signal: undefined,
      stdout: '',
      stderr: '',
    })

    t.ok(proc.called)
  })

  t.end()
})
