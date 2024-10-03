'use strict'

const spawk = require('spawk')
const t = require('tap')

const promiseSpawn = require('../lib/index.js')

spawk.preventUnmatched()
t.afterEach(() => {
  spawk.clean()
})

t.test('sh', (t) => {
  t.test('runs in shell', async (t) => {
    const proc = spawk.spawn('sh', ['-c', 'echo hello'], { shell: true })
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
    const proc = spawk.spawn('sh', ['-c', 'echo \'hello world\''], { shell: true })
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

t.test('cmd', (t) => {
  t.test('runs in shell', async (t) => {
    const proc = spawk.spawn('cmd.exe', ['/d', '/s', '/c', 'echo hello'], {
      shell: true,
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

  t.test('works when initial cmd is wrapped in quotes', async (t) => {
    const proc = spawk.spawn('cmd.exe', ['/d', '/s', '/c', '"echo" hello'], {
      shell: true,
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
      shell: true,
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
      shell: true,
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
          t.equal(key, 'dir')
          return 'dir.exe'
        },
      },
    })

    const proc = spawk.spawn('cmd.exe', ['/d', '/s', '/c', 'dir ^"with^ spaces^"'], {
      shell: true,
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
          t.equal(key, 'dir')
          return 'dir.cmd'
        },
      },
    })

    const proc = spawk.spawn('cmd.exe', ['/d', '/s', '/c', 'dir ^^^"with^^^ spaces^^^"'], {
      shell: true,
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
          t.equal(key, 'dir')
          t.equal(opts.path, PATH)
          t.equal(opts.pathext, PATHEXT)
          return 'dir.exe'
        },
      },
    })

    const proc = spawk.spawn('cmd.exe', ['/d', '/s', '/c', 'dir ^"with^ spaces^"'], {
      shell: true,
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
          t.equal(key, 'dir')
          t.equal(opts.path, PATH)
          t.equal(opts.pathext, PATHEXT)
          return 'dir.exe'
        },
      },
    })

    const proc = spawk.spawn('cmd.exe', ['/d', '/s', '/c', 'dir ^"with^ spaces^"'], {
      shell: true,
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
