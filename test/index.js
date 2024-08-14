'use strict'

const os = require('os')
const spawk = require('spawk')
const t = require('tap')

const promiseSpawn = require('../lib/index.js')

spawk.preventUnmatched()
t.afterEach(() => {
  spawk.clean()
})

t.test('defaults to returning strings', async (t) => {
  const proc = spawk.spawn('pass', [], {})
    .stdout(Buffer.from('OK\n'))

  const result = await promiseSpawn('pass', [])
  t.hasStrict(result, {
    code: 0,
    signal: undefined,
    stdout: 'OK',
    stderr: '',
  })

  t.ok(proc.called)
})

t.test('extra context is returned', async (t) => {
  const proc = spawk.spawn('pass', [], {})
    .stdout(Buffer.from('OK\n'))

  const result = await promiseSpawn('pass', [], {}, { extra: 'property' })
  t.hasStrict(result, {
    code: 0,
    signal: undefined,
    stdout: 'OK',
    stderr: '',
    extra: 'property',
  })

  t.ok(proc.called)
})

t.test('stdioString false returns buffers', async (t) => {
  const proc = spawk.spawn('pass', [], {})
    .stdout(Buffer.from('OK\n'))

  const result = await promiseSpawn('pass', [], { stdioString: false })
  t.hasStrict(result, {
    code: 0,
    signal: undefined,
    stdout: Buffer.from('OK\n'),
    stderr: Buffer.from(''),
  })

  t.ok(proc.called)
})

t.test('stdout and stderr are null when stdio is inherit', async (t) => {
  const proc = spawk.spawn('pass', [], { stdio: 'inherit' })
    .stdout(Buffer.from('OK\n'))

  const result = await promiseSpawn('pass', [], { stdio: 'inherit' })
  t.hasStrict(result, {
    code: 0,
    signal: undefined,
    stdout: null,
    stderr: null,
  })

  t.ok(proc.called)
})

t.test('stdout and stderr are null when stdio is inherit and stdioString is false', async (t) => {
  const proc = spawk.spawn('pass', [], { stdio: 'inherit' })
    .stdout(Buffer.from('OK\n'))

  const result = await promiseSpawn('pass', [], { stdio: 'inherit', stdioString: false })
  t.hasStrict(result, {
    code: 0,
    signal: undefined,
    stdout: null,
    stderr: null,
  })

  t.ok(proc.called)
})

t.test('stdout is null when stdio is [pipe, inherit, pipe]', async (t) => {
  const proc = spawk.spawn('pass', [], { stdio: ['pipe', 'inherit', 'pipe'] })
    .stdout(Buffer.from('OK\n'))

  const result = await promiseSpawn('pass', [], { stdio: ['pipe', 'inherit', 'pipe'] })
  t.hasStrict(result, {
    code: 0,
    signal: undefined,
    stdout: null,
    stderr: '',
  })

  t.ok(proc.called)
})

t.test('stderr is null when stdio is [pipe, pipe, inherit]', async (t) => {
  const proc = spawk.spawn('pass', [], { stdio: ['pipe', 'pipe', 'inherit'] })
    .stdout(Buffer.from('OK\n'))

  const result = await promiseSpawn('pass', [], { stdio: ['pipe', 'pipe', 'inherit'] })
  t.hasStrict(result, {
    code: 0,
    signal: undefined,
    stdout: 'OK',
    stderr: null,
  })

  t.ok(proc.called)
})

t.test('exposes stdin', async (t) => {
  const proc = spawk.spawn('stdin', [], {})
  const p = promiseSpawn('stdin', [])
  process.nextTick(() => {
    p.process.stdin.pipe(p.process.stdout)
    p.stdin.end('hello')
  })

  const result = await p
  t.hasStrict(result, {
    code: 0,
    signal: undefined,
    stdout: 'hello',
    stderr: '',
  })

  t.ok(proc.called)
})

t.test('exposes process', async (t) => {
  const proc = spawk.spawn('proc', [], {})
    .exitOnSignal('SIGFAKE')

  const p = promiseSpawn('proc', [])
  process.nextTick(() => p.process.kill('SIGFAKE'))

  // there are no signals in windows, so we expect a different result
  if (process.platform === 'win32') {
    await t.rejects(p, {
      code: 1,
      signal: undefined,
      stdout: '',
      stderr: '',
    })
  } else {
    await t.rejects(p, {
      code: null,
      signal: 'SIGFAKE',
      stdout: '',
      stderr: '',
    })
  }

  t.ok(proc.called)
})

t.test('rejects when spawn errors', async (t) => {
  const proc = spawk.spawn('notfound', [], {})
    .spawnError(new Error('command not found'))

  await t.rejects(promiseSpawn('notfound', []), {
    message: 'command not found',
    stdout: '',
    stderr: '',
  })

  t.ok(proc.called)
})

t.test('spawn error includes extra', async (t) => {
  const proc = spawk.spawn('notfound', [], {})
    .spawnError(new Error('command not found'))

  await t.rejects(promiseSpawn('notfound', [], {}, { extra: 'property' }), {
    message: 'command not found',
    stdout: '',
    stderr: '',
    extra: 'property',
  })

  t.ok(proc.called)
})

t.test('spawn error respects stdioString', async (t) => {
  const proc = spawk.spawn('notfound', [], {})
    .spawnError(new Error('command not found'))

  await t.rejects(promiseSpawn('notfound', [], { stdioString: false }), {
    message: 'command not found',
    stdout: Buffer.from(''),
    stderr: Buffer.from(''),
  })

  t.ok(proc.called)
})

t.test('spawn error respects stdio as inherit', async (t) => {
  const proc = spawk.spawn('notfound', [], { stdio: 'inherit' })
    .spawnError(new Error('command not found'))

  await t.rejects(promiseSpawn('notfound', [], { stdio: 'inherit' }), {
    message: 'command not found',
    stdout: null,
    stderr: null,
  })

  t.ok(proc.called)
})

t.test('rejects when command fails', async (t) => {
  const proc = spawk.spawn('fail', [], {})
    .stderr(Buffer.from('Error!\n'))
    .exit(1)

  await t.rejects(promiseSpawn('fail', []), {
    message: 'command failed',
    code: 1,
    stdout: '',
    stderr: 'Error!',
  })

  t.ok(proc.called)
})

t.test('failed command returns extra', async (t) => {
  const proc = spawk.spawn('fail', [], {})
    .stderr(Buffer.from('Error!\n'))
    .exit(1)

  await t.rejects(promiseSpawn('fail', [], {}, { extra: 'property' }), {
    message: 'command failed',
    code: 1,
    stdout: '',
    stderr: 'Error!',
    extra: 'property',
  })

  t.ok(proc.called)
})

t.test('failed command respects stdioString', async (t) => {
  const proc = spawk.spawn('fail', [], {})
    .stderr(Buffer.from('Error!\n'))
    .exit(1)

  await t.rejects(promiseSpawn('fail', [], { stdioString: false }), {
    message: 'command failed',
    code: 1,
    stdout: Buffer.from(''),
    stderr: Buffer.from('Error!\n'),
  })

  t.ok(proc.called)
})

t.test('failed command respects stdio as inherit', async (t) => {
  const proc = spawk.spawn('fail', [], { stdio: 'inherit' })
    .stderr(Buffer.from('Error!\n'))
    .exit(1)

  await t.rejects(promiseSpawn('fail', [], { stdio: 'inherit' }), {
    message: 'command failed',
    code: 1,
    stdout: null,
    stderr: null,
  })

  t.ok(proc.called)
})

t.test('rejects when signal kills child', async (t) => {
  const proc = spawk.spawn('signal', [], {})
    .signal('SIGFAKE')

  const p = promiseSpawn('signal', [])
  // there are no signals in windows, so we expect a different result
  if (process.platform === 'win32') {
    await t.rejects(p, {
      code: 1,
      signal: undefined,
      stdout: '',
      stderr: '',
    })
  } else {
    await t.rejects(p, {
      code: null,
      signal: 'SIGFAKE',
      stdout: '',
      stderr: '',
    })
  }

  t.ok(proc.called)
})

t.test('signal death includes extra', async (t) => {
  const proc = spawk.spawn('signal', [], {})
    .signal('SIGFAKE')

  const p = promiseSpawn('signal', [], {}, { extra: 'property' })
  // there are no signals in windows, so we expect a different result
  if (process.platform === 'win32') {
    await t.rejects(p, {
      code: 1,
      signal: undefined,
      stdout: '',
      stderr: '',
      extra: 'property',
    })
  } else {
    await t.rejects(p, {
      code: null,
      signal: 'SIGFAKE',
      stdout: '',
      stderr: '',
      extra: 'property',
    })
  }

  t.ok(proc.called)
})

t.test('signal death respects stdioString', async (t) => {
  const proc = spawk.spawn('signal', [], {})
    .signal('SIGFAKE')

  const p = promiseSpawn('signal', [], { stdioString: false })
  // there are no signals in windows, so we expect a different result
  if (process.platform === 'win32') {
    await t.rejects(p, {
      code: 1,
      signal: undefined,
      stdout: Buffer.from(''),
      stderr: Buffer.from(''),
    })
  } else {
    await t.rejects(p, {
      code: null,
      signal: 'SIGFAKE',
      stdout: Buffer.from(''),
      stderr: Buffer.from(''),
    })
  }

  t.ok(proc.called)
})

t.test('signal death respects stdio as inherit', async (t) => {
  const proc = spawk.spawn('signal', [], { stdio: 'inherit' })
    .signal('SIGFAKE')

  const p = promiseSpawn('signal', [], { stdio: 'inherit' })
  // there are no signals in windows, so we expect a different result
  if (process.platform === 'win32') {
    await t.rejects(p, {
      code: 1,
      signal: undefined,
      stdout: null,
      stderr: null,
    })
  } else {
    await t.rejects(p, {
      code: null,
      signal: 'SIGFAKE',
      stdout: null,
      stderr: null,
    })
  }

  t.ok(proc.called)
})

t.test('rejects when stdout errors', async (t) => {
  const proc = spawk.spawn('stdout-err', [], {})

  const p = promiseSpawn('stdout-err', [])
  process.nextTick(() => p.process.stdout.emit('error', new Error('stdout err')))

  await t.rejects(p, {
    message: 'stdout err',
    code: null,
    signal: undefined,
    stdout: '',
    stderr: '',
  })

  t.ok(proc.called)
})

t.test('rejects when stderr errors', async (t) => {
  const proc = spawk.spawn('stderr-err', [], {})

  const p = promiseSpawn('stderr-err', [])
  process.nextTick(() => p.process.stderr.emit('error', new Error('stderr err')))

  await t.rejects(p, {
    message: 'stderr err',
    code: null,
    signal: undefined,
    stdout: '',
    stderr: '',
  })

  t.ok(proc.called)
})

t.test('open function detects WSL and uses Windows commands', async (t) => {
  const originalPlatform = process.platform
  const originalRelease = os.release
  const originalComSpec = process.env.ComSpec

  // Mock WSL environment
  Object.defineProperty(process, 'platform', { value: 'linux' })
  os.release = () => 'Linux version 4.4.0-19041-Microsoft'
  process.env.ComSpec = 'C:\\Windows\\System32\\cmd.exe'

  try {
    const url = 'https://example.com'
    const expectedCommand = 'sh'
    const expectedArgs = [
      '-c',
      'C:\\Windows\\System32\\cmd.exe /c start "" https://example.com',
    ]
    const expectedOptions = { shell: false }

    const proc = spawk
      .spawn(expectedCommand, expectedArgs, expectedOptions)
      .exit(0)

    await promiseSpawn.open(url)

    t.ok(proc.called, 'The correct command was called in WSL environment')
    t.same(
      proc.calledWith.args,
      expectedArgs,
      'Arguments were correctly formed for WSL'
    )
  } finally {
    // Restore original values
    Object.defineProperty(process, 'platform', { value: originalPlatform })
    os.release = originalRelease
    process.env.ComSpec = originalComSpec
  }
})

t.test(
  'spawnWithShell handles command with alternating quotes on Windows',
  async (t) => {
    const originalPlatform = process.platform
    const originalComSpec = process.env.ComSpec

    // Mock Windows environment
    Object.defineProperty(process, 'platform', { value: 'win32' })
    process.env.ComSpec = 'C:\\Windows\\System32\\cmd.exe'

    try {
      const cmd = 'echo "Hello \'World\'" more args'
      const args = []
      const opts = { shell: true }

      const expectedCommand = 'C:\\Windows\\System32\\cmd.exe'
      const expectedArgs = [
        '/d',
        '/s',
        '/c',
        'echo "Hello \'World\'" more args',
      ]
      const expectedOptions = { shell: false, windowsVerbatimArguments: true }

      const proc = spawk
        .spawn(expectedCommand, expectedArgs, expectedOptions)
        .stdout("Hello 'World'\r\n")
        .exit(0)

      const result = await promiseSpawn(cmd, args, opts)

      t.equal(result.stdout, "Hello 'World'", 'Command output is correct')
      t.equal(result.code, 0, 'Exit code is 0')
      t.ok(proc.called, 'The correct command was called')
    } finally {
      // Restore original values
      Object.defineProperty(process, 'platform', { value: originalPlatform })
      process.env.ComSpec = originalComSpec
    }
  }
)

t.test(
  'spawnWithShell handles command with arguments on Unix-like systems',
  async (t) => {
    const originalPlatform = process.platform

    // Mock Unix-like environment
    Object.defineProperty(process, 'platform', { value: 'linux' })

    try {
      const cmd = 'echo'
      const args = ['Hello', 'World', 'with spaces', '"and quotes"']
      const opts = { shell: true }

      const expectedCommand = 'sh'
      const expectedArgs = [
        '-c',
        `echo Hello World 'with spaces' '"and quotes"'`,
      ]
      const expectedOptions = { shell: false }

      const proc = spawk
        .spawn(expectedCommand, expectedArgs, expectedOptions)
        .stdout('Hello World with spaces "and quotes"\n')
        .exit(0)

      const result = await promiseSpawn(cmd, args, opts)

      t.equal(
        result.stdout,
        'Hello World with spaces "and quotes"',
        'Command output is correct'
      )
      t.equal(result.code, 0, 'Exit code is 0')
      t.ok(proc.called, 'The correct command was called')

      // Check that spawk was called with the correct arguments
      t.same(
        proc.calledWith.args,
        expectedArgs,
        'Arguments were correctly escaped'
      )
    } finally {
      Object.defineProperty(process, 'platform', { value: originalPlatform })
    }
  }
)

t.test('open function uses correct command on macOS', async (t) => {
  const originalPlatform = process.platform

  // Mock macOS environment
  Object.defineProperty(process, 'platform', { value: 'darwin' })

  try {
    const url = 'https://example.com'
    const expectedCommand = 'sh'
    const expectedArgs = ['-c', 'open https://example.com']
    const expectedOptions = { shell: false }

    const proc = spawk
      .spawn(expectedCommand, expectedArgs, expectedOptions)
      .exit(0)

    await promiseSpawn.open(url)

    t.ok(proc.called, 'The correct command was called on macOS')
    t.same(
      proc.calledWith.args,
      expectedArgs,
      'Arguments were correctly formed for macOS'
    )
  } finally {
    // Restore original platform
    Object.defineProperty(process, 'platform', { value: originalPlatform })
  }
})

t.test('open function uses correct command on Linux', async (t) => {
  const originalPlatform = process.platform
  const originalRelease = os.release

  // Mock Linux environment (non-WSL)
  Object.defineProperty(process, 'platform', { value: 'linux' })
  os.release = () => 'Linux version 5.4.0-generic'

  try {
    const url = 'https://example.com'
    const expectedCommand = 'sh'
    const expectedArgs = ['-c', 'xdg-open https://example.com']
    const expectedOptions = { shell: false }

    const proc = spawk
      .spawn(expectedCommand, expectedArgs, expectedOptions)
      .exit(0)

    await promiseSpawn.open(url)

    t.ok(proc.called, 'The correct command was called on Linux')
    t.same(
      proc.calledWith.args,
      expectedArgs,
      'Arguments were correctly formed for Linux'
    )
  } finally {
    // Restore original values
    Object.defineProperty(process, 'platform', { value: originalPlatform })
    os.release = originalRelease
  }
})

t.test(
  'spawnWithShell handles case-insensitive environment variables',
  async (t) => {
    const originalPlatform = process.platform
    const originalEnv = process.env

    // Mock Windows environment
    Object.defineProperty(process, 'platform', { value: 'win32' })
    process.env = {
      ComSpec: 'C:\\Windows\\System32\\cmd.exe',
      Path: 'C:\\Windows\\System32;C:\\Windows',
      PATHEXT: '.COM;.EXE;.BAT;.CMD',
    }

    try {
      const cmd = 'echo'
      const args = ['Hello']
      const opts = {
        shell: true,
        env: {
          PATH: 'D:\\CustomPath',
          pathext: '.EXE',
          comspec: 'D:\\CustomCmd.exe',
        },
      }

      const expectedCommand = 'C:\\Windows\\System32\\cmd.exe'
      const expectedArgs = ['/d', '/s', '/c', 'echo Hello']
      const expectedOptions = {
        shell: false,
        windowsVerbatimArguments: true,
        env: {
          PATH: 'D:\\CustomPath',
          pathext: '.EXE',
          comspec: 'D:\\CustomCmd.exe',
        },
      }

      const proc = spawk
        .spawn(expectedCommand, expectedArgs, expectedOptions)
        .stdout('Hello\r\n')
        .exit(0)

      const result = await promiseSpawn(cmd, args, opts)

      t.equal(result.stdout, 'Hello', 'Command output is correct')
      t.equal(result.code, 0, 'Exit code is 0')
      t.ok(proc.called, 'The correct command was called')
      t.same(
        proc.calledWith.command,
        expectedCommand,
        'Correct shell was used (system ComSpec)'
      )
      t.same(proc.calledWith.args, expectedArgs, 'Correct arguments were used')
      t.same(
        proc.calledWith.options.env.PATH,
        'D:\\CustomPath',
        'Corect PATH used(case-insensitive)'
      )
      t.same(
        proc.calledWith.options.env.pathext,
        '.EXE',
        'Correct PATHEXT used (case-insensitive)'
      )
      t.same(
        proc.calledWith.options.env.comspec,
        'D:\\CustomCmd.exe',
        'Custom COMSPEC was preserved in env'
      )
    } finally {
      // Restore original values
      Object.defineProperty(process, 'platform', { value: originalPlatform })
      process.env = originalEnv
    }
  }
)

t.test(
  'spawnWithShell handles command starting with quotes on Windows',
  async (t) => {
    const originalPlatform = Object.getOwnPropertyDescriptor(
      process,
      'platform'
    )
    const originalEnv = process.env

    // Mock Windows environment
    Object.defineProperty(process, 'platform', {
      value: 'win32',
    })
    process.env = {
      ComSpec: 'C:\\Windows\\System32\\cmd.exe',
      Path: 'C:\\Windows\\System32;C:\\Windows',
      PATHEXT: '.COM;.EXE;.BAT;.CMD',
    }

    try {
      const cmd = '"C:\\Program Files\\My App\\myapp.exe" -arg1 value1'
      const args = []
      const opts = { shell: true }

      const expectedCommand = 'C:\\Windows\\System32\\cmd.exe'
      const expectedArgs = ['/d', '/s', '/c', cmd]
      const expectedOptions = {
        shell: false,
        windowsVerbatimArguments: true,
      }

      // Set up spawk to intercept the spawn call
      const proc = spawk
        .spawn(expectedCommand, expectedArgs, expectedOptions)
        .stdout('Output from myapp\r\n')
        .exit(0)

      const result = await promiseSpawn(cmd, args, opts)

      t.equal(result.stdout, 'Output from myapp', 'Command output is correct')
      t.equal(result.code, 0, 'Exit code is 0')
      t.ok(proc.called, 'The correct command was called')
      t.same(proc.calledWith.command, expectedCommand, 'Correct shell used')
      t.same(proc.calledWith.args, expectedArgs, 'Correct arguments were used')
      t.same(
        proc.calledWith.options.windowsVerbatimArguments,
        true,
        'windowsVerbatimArguments is true'
      )
      t.same(proc.calledWith.options.shell, false, 'shell option is false')
    } finally {
      // Restore original values
      Object.defineProperty(process, 'platform', originalPlatform)
      process.env = originalEnv
      spawk.clean()
    }
  }
)
