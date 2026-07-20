'use strict'

const path = require('path')
const spawk = require('spawk')
const t = require('tap')

const actualPromiseSpawn = require('../lib/index.js')
const actualPlatform = process.platform

const pathMock = {
  ...path,
  posix: {
    ...path.posix,
    isAbsolute: () => true,
  },
}

// Keep ordinary spawn assertions stable across platforms; shell resolution
// behaviour has dedicated tests below.
const promiseSpawn = t.mock('../lib/index.js', {
  path: pathMock,
  which: { sync: (cmd) => path.win32.basename(cmd) },
})

spawk.preventUnmatched()
t.afterEach(() => {
  spawk.clean()
})

const mockPlatform = (t, platform) => {
  const platformDesc = Object.getOwnPropertyDescriptor(process, 'platform')
  Object.defineProperty(process, 'platform', { ...platformDesc, value: platform })
  t.teardown(() => {
    Object.defineProperty(process, 'platform', platformDesc)
  })
}

const mockEnv = (t, key, value) => {
  const original = process.env[key]
  if (value === undefined) {
    delete process.env[key]
  } else {
    process.env[key] = value
  }
  t.teardown(() => {
    if (original === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = original
    }
  })
}

const mockCwd = (t, cwd) => {
  const original = process.cwd
  process.cwd = () => cwd
  t.teardown(() => {
    process.cwd = original
  })
}

t.test('sh', (t) => {
  t.test('runs in shell', async (t) => {
    mockPlatform(t, 'win32')
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
    mockPlatform(t, 'linux')
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
    t.equal(shellCall.opts.pathExt, process.env.PATHEXT, 'used the ambient PATHEXT')
    t.equal(shellCall.opts.nothrow, true, 'resolved with nothrow')
    t.not(shellCall.opts.path, '/tmp/evil/node_modules/.bin',
      'did not resolve against the untrusted opts.env.PATH')
    t.ok(proc.called, 'spawned the resolved absolute shell path')
  })

  t.test('anchors a relative shell result to the lookup cwd', async (t) => {
    mockPlatform(t, 'linux')
    mockEnv(t, 'PATH', '.')

    const promiseSpawnMock = t.mock('../lib/index.js', {
      which: {
        sync: () => 'sh',
      },
    })
    mockCwd(t, '/lookup')
    const env = { PATH: '/execution/evil' }
    const proc = spawk.spawn('/lookup/sh', ['-c', 'echo hello'], {
      cwd: '/execution',
      env,
      shell: false,
    })
      .stdout(Buffer.from('hello\n'))

    await promiseSpawnMock('echo', ['hello'], {
      cwd: '/execution',
      env,
      shell: 'sh',
    })

    t.ok(proc.called, 'spawned the shell selected from the lookup cwd')
  })

  t.test('rejects when a bare shell is not on the trusted PATH', async (t) => {
    mockPlatform(t, 'linux')
    const promiseSpawnMock = t.mock('../lib/index.js', {
      which: {
        sync: () => null,
      },
    })

    const promise = promiseSpawnMock('echo', ['hello'], {
      shell: 'missing-shell',
      stdioString: false,
    }, {
      extra: 'property',
    })
    const exit = new Promise(resolve => {
      promise.process.once('exit', (code, signal) => resolve({ code, signal }))
    })

    t.equal(promise.stdin, null)
    t.equal(promise.process.stdin, null)
    t.equal(promise.process.kill(), false)
    await t.rejects(promise, {
      code: 'ENOENT',
      message: 'not found: missing-shell',
      cmd: 'echo',
      args: ['hello'],
      stdout: Buffer.from(''),
      stderr: Buffer.from(''),
      extra: 'property',
    })
    t.same(await exit, { code: null, signal: null })
  })

  t.test('preserves an explicit relative shell path', async (t) => {
    mockPlatform(t, 'linux')
    const calls = []
    const promiseSpawnMock = t.mock('../lib/index.js', {
      which: {
        sync: (key) => {
          calls.push(key)
          return key
        },
      },
    })

    const proc = spawk.spawn('./tools/sh', ['-c', 'echo hello'], {
      cwd: '/tmp/project',
      shell: false,
    })
      .stdout(Buffer.from('hello\n'))

    await promiseSpawnMock('echo', ['hello'], {
      cwd: '/tmp/project',
      shell: './tools/sh',
    })

    t.same(calls, [], 'did not resolve an explicit shell path')
    t.ok(proc.called, 'passed the explicit path through to spawn')
  })

  t.end()
})

t.test('Windows shell interpreter resolution', (t) => {
  t.test('checks only path-qualified ambient PATH candidates', async (t) => {
    mockPlatform(t, 'win32')
    mockEnv(t, 'PATH', 'C:\\first;;"";"C:\\Program Files\\trusted";C:\\last')
    mockEnv(t, 'PATHEXT', '.EXE;.CMD')

    const shellCalls = []
    const trustedShell = 'C:\\Program Files\\trusted\\cmd.exe'
    const promiseSpawnMock = t.mock('../lib/index.js', {
      which: {
        sync: (key, opts) => {
          if (key === 'echo') {
            return 'echo.exe'
          }
          shellCalls.push({ key, opts })
          return key === trustedShell ? key : null
        },
      },
    })

    const proc = spawk.spawn(trustedShell, ['/d', '/s', '/c', 'echo hello'], {
      shell: false,
      windowsVerbatimArguments: true,
    })
      .stdout(Buffer.from('hello\n'))

    await promiseSpawnMock('echo', ['hello'], {
      shell: 'cmd.exe',
      env: { PATH: 'C:\\evil' },
    })

    t.same(shellCalls.map(({ key }) => key), [
      'C:\\first\\cmd.exe',
      trustedShell,
    ])
    for (const { opts } of shellCalls) {
      t.equal(opts.pathExt, '.EXE;.CMD')
      t.equal(opts.nothrow, true)
      t.notOk(opts.path, 'did not perform a bare PATH search')
    }
    t.ok(proc.called)
  })

  t.test('rejects when no Windows PATH candidate exists', async (t) => {
    mockPlatform(t, 'win32')
    mockEnv(t, 'PATH', 'C:\\first;C:\\last')

    const promiseSpawnMock = t.mock('../lib/index.js', {
      which: {
        sync: () => null,
      },
    })

    await t.rejects(promiseSpawnMock('echo', ['hello'], { shell: 'missing.exe' }), {
      code: 'ENOENT',
      message: 'not found: missing.exe',
    })
  })

  t.test('rejects when the ambient Windows PATH is missing', async (t) => {
    mockPlatform(t, 'win32')
    mockEnv(t, 'PATH', undefined)
    const calls = []
    const promiseSpawnMock = t.mock('../lib/index.js', {
      which: {
        sync: (key) => {
          calls.push(key)
          return key
        },
      },
    })

    await t.rejects(promiseSpawnMock('echo', ['hello'], { shell: 'missing.exe' }), {
      code: 'ENOENT',
      message: 'not found: missing.exe',
    })
    t.same(calls, [], 'did not perform any executable lookup')
  })

  t.test('preserves an explicit Windows shell path', async (t) => {
    mockPlatform(t, 'win32')
    const calls = []
    const shell = '.\\tools\\cmd.exe'
    const promiseSpawnMock = t.mock('../lib/index.js', {
      which: {
        sync: (key) => {
          calls.push(key)
          return 'echo.exe'
        },
      },
    })

    const proc = spawk.spawn(shell, ['/d', '/s', '/c', 'echo hello'], {
      cwd: 'C:\\project',
      shell: false,
      windowsVerbatimArguments: true,
    })
      .stdout(Buffer.from('hello\n'))

    await promiseSpawnMock('echo', ['hello'], {
      cwd: 'C:\\project',
      shell,
    })

    t.same(calls, ['echo'], 'only resolved the command run inside cmd')
    t.ok(proc.called, 'passed the explicit shell path through to spawn')
  })

  t.test('does not select a shell from the current directory', {
    skip: actualPlatform !== 'win32',
  }, async (t) => {
    const fixture = t.testdir({
      cwd: { 'cmd.exe': '' },
      trusted: { 'cmd.exe': '' },
    })
    const originalCwd = process.cwd()
    const cwd = path.join(fixture, 'cwd')
    const trusted = path.join(fixture, 'trusted')
    const trustedShell = path.join(trusted, 'cmd.exe')

    mockEnv(t, 'PATH', trusted)
    mockEnv(t, 'PATHEXT', '.EXE')
    mockEnv(t, 'NoDefaultCurrentDirectoryInExePath', '1')
    t.teardown(() => process.chdir(originalCwd))
    process.chdir(cwd)

    const proc = spawk.spawn(trustedShell, ['/d', '/s', '/c', 'echo hello'], {
      shell: false,
      windowsVerbatimArguments: true,
    })
      .stdout(Buffer.from('hello\n'))

    await actualPromiseSpawn('echo', ['hello'], { shell: 'cmd.exe' })
    t.ok(proc.called, 'spawned the shell from the trusted PATH')
  })

  t.end()
})

t.test('cmd', (t) => {
  mockPlatform(t, 'linux')

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
      path: pathMock,
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
      path: pathMock,
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
      path: pathMock,
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
      path: pathMock,
      which: {
        sync: (key, opts) => {
          if (key === 'cmd.exe') {
            return key
          }
          t.equal(key, 'dir')
          t.equal(opts.path, PATH)
          t.equal(opts.pathExt, PATHEXT)
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
      path: pathMock,
      which: {
        sync: (key, opts) => {
          if (key === 'cmd.exe') {
            return key
          }
          t.equal(key, 'dir')
          t.equal(opts.path, PATH)
          t.equal(opts.pathExt, PATHEXT)
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
