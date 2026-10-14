'use strict'

const spawk = require('spawk')
const t = require('tap')

const promiseSpawn = require('../lib/index.js')

spawk.preventUnmatched()
t.afterEach(() => {
  spawk.clean()
})

t.test('sh', (t) => {
  for (const [platform, shell] of [
    ['linux', '/opt/tools/cmd'],
    ['linux', '/opt/tools/cmd.exe'],
    ['linux', 'C:/tools/sh.exe'],
    ['win32', 'C:/tools/sh.exe'],
  ]) {
    t.test(`${platform} preserves non-cmd shell ${shell}`, async (t) => {
      const platformDesc = Object.getOwnPropertyDescriptor(process, 'platform')
      Object.defineProperty(process, 'platform', { ...platformDesc, value: platform })
      t.teardown(() => Object.defineProperty(process, 'platform', platformDesc))
      const proc = spawk.spawn(shell, ['-c', "echo 'hello world'"], { shell: false })
        .stdout(Buffer.from('hello world\n'))

      const result = await promiseSpawn('echo', ['hello world'], { shell })
      t.equal(result.stdout, 'hello world')
      t.ok(proc.called)
    })
  }

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

t.test('cmd', (t) => {
  for (const shell of [
    'C:/Windows/System32/cmd.exe',
    'C:\\Windows\\System32/cmd.exe',
    'C:/Windows/System32/CMD.EXE',
    'C:/Windows/System32/cmd',
    'C:\\Windows\\System32\\cmd.exe',
  ]) {
    for (const extension of ['exe', 'cmd', 'bat']) {
      t.test(`${shell} escapes arguments for .${extension}`, async (t) => {
        const platformDesc = Object.getOwnPropertyDescriptor(process, 'platform')
        Object.defineProperty(process, 'platform', { ...platformDesc, value: 'win32' })
        t.teardown(() => Object.defineProperty(process, 'platform', platformDesc))
        const promiseSpawnMock = t.mock('../lib/index.js', {
          which: {
            sync: () => `tool.${extension}`,
          },
        })
        const script = extension === 'exe'
          ? 'tool ^"hello^ world^"'
          : 'tool ^^^"hello^^^ world^^^"'
        const proc = spawk.spawn(shell.replace(/\//g, '\\'), ['/d', '/s', '/c', script], {
          shell: false,
          windowsVerbatimArguments: true,
        }).stdout(Buffer.from('hello world\n'))

        const result = await promiseSpawnMock('tool', ['hello world'], { shell })
        t.equal(result.stdout, 'hello world')
        t.ok(proc.called)
      })
    }
  }

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

  for (const testCase of [
    {
      name: 'works when initial cmd is escaped and wrapped in quotes',
      command: '^"echo^"',
      lookup: 'echo',
      resolved: 'echo.exe',
      script: '^"echo^" hello',
      args: ['hello'],
      stdout: 'hello',
    },
    {
      name: 'finds an escaped batch shim for double escaping',
      command: '^"shim.cmd^"',
      lookup: 'shim.cmd',
      resolved: 'shim.cmd',
      script: '^"shim.cmd^" ^^^"hello^^^ world^^^"',
      args: ['hello world'],
      stdout: 'hello world',
    },
    {
      name: 'finds an escaped batch shim with a space',
      command: '^"two^ words.cmd^"',
      lookup: 'two words.cmd',
      resolved: 'two words.cmd',
      script: '^"two^ words.cmd^" ^^^"hello^^^ world^^^"',
      args: ['hello world'],
      stdout: 'hello world',
    },
  ]) {
    t.test(testCase.name, async (t) => {
      const promiseSpawnMock = t.mock('../lib/index.js', {
        which: {
          sync: (key) => {
            t.equal(key, testCase.lookup)
            return testCase.resolved
          },
        },
      })

      const proc = spawk.spawn('cmd.exe', ['/d', '/s', '/c', testCase.script], {
        shell: false,
        windowsVerbatimArguments: true,
      })
        .stdout(Buffer.from(`${testCase.stdout}\n`))

      const result = await promiseSpawnMock(testCase.command, testCase.args, { shell: 'cmd.exe' })
      t.hasStrict(result, {
        code: 0,
        signal: undefined,
        stdout: testCase.stdout,
        stderr: '',
      })

      t.ok(proc.called)
    })
  }

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
