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
    const expectedCommand = 'C:\\Windows\\System32\\cmd.exe'
    const expectedArgs = ['/d', '/s', '/c', 'start "" https://example.com']
    const expectedOptions = { shell: true, windowsVerbatimArguments: true }

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
    t.same(
      proc.calledWith.options,
      expectedOptions,
      'Options were correctly set for WSL'
    )
  } finally {
    // Restore original values
    Object.defineProperty(process, 'platform', { value: originalPlatform })
    os.release = originalRelease
    process.env.ComSpec = originalComSpec
  }
})

t.test('open function uses correct command on macOS', async (t) => {
  const originalPlatform = process.platform

  // Mock macOS environment
  Object.defineProperty(process, 'platform', { value: 'darwin' })

  try {
    const url = 'https://example.com'
    const expectedCommand = 'sh'
    const expectedArgs = ['-c', 'open https://example.com']
    const expectedOptions = { shell: true }

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
    t.same(
      proc.calledWith.options,
      expectedOptions,
      'Options were correctly set for macOS'
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
    const expectedOptions = { shell: true }

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
    t.same(
      proc.calledWith.options,
      expectedOptions,
      'Options were correctly set for Linux'
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
        shell: true,
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
        'Correct PATH used (case-insensitive)'
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
      t.same(
        proc.calledWith.options.shell,
        true,
        'Shell option is set to true'
      )
      t.same(
        proc.calledWith.options.windowsVerbatimArguments,
        true,
        'windowsVerbatimArguments is set to true'
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
        shell: true,
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
      t.same(proc.calledWith.options.shell, true, 'shell option is true')
    } finally {
      // Restore original values
      Object.defineProperty(process, 'platform', originalPlatform)
      process.env = originalEnv
      spawk.clean()
    }
  }
)

t.test('open function handles case when command is not set', async (t) => {
  const originalPlatform = process.platform
  const originalComSpec = process.env.ComSpec
  const originalOpen = promiseSpawn.open

  Object.defineProperty(process, 'platform', { value: 'win32' })
  delete process.env.ComSpec

  // Override the open function to force the command to be undefined
  promiseSpawn.open = (args, opts = {}, extra = {}) => {
    opts.command = undefined
    return originalOpen(args, opts, extra)
  }

  try {
    const url = 'https://example.com'
    const proc = spawk
      .spawn(() => {
        return true // Match any spawn call
      })
      .exit(0)

    await promiseSpawn.open(url)

    t.ok(proc.called, 'A spawn call was made')

    // Check if either the command or any of the args contain 'cmd.exe' or 'start'
    const cmdExeUsed = proc.calledWith.command.includes('cmd.exe') ||
                       proc.calledWith.args.some(arg => arg.includes('cmd.exe') ||
                       arg.includes('start'))

    t.ok(cmdExeUsed, 'cmd.exe or start command is used when command is not set')
  } finally {
    // Restore original values
    Object.defineProperty(process, 'platform', { value: originalPlatform })
    process.env.ComSpec = originalComSpec
    promiseSpawn.open = originalOpen
  }
})

t.test('open function uses default command when no command is provided on Windows', async (t) => {
  const originalPlatform = process.platform
  const originalComSpec = process.env.ComSpec

  // Mock Windows environment
  Object.defineProperty(process, 'platform', { value: 'win32' })
  process.env.ComSpec = 'C:\\WINDOWS\\system32\\cmd.exe'

  try {
    const url = 'https://example.com'

    console.log('Test setup:')
    console.log('Platform:', process.platform)
    console.log('ComSpec:', process.env.ComSpec)
    console.log('URL:', url)

    const expectedCommand = 'C:\\WINDOWS\\system32\\cmd.exe'
    const expectedArgs = ['/d', '/s', '/c', `start "" ${url}`]
    const expectedOptions = {
      shell: true,
      windowsVerbatimArguments: true,
    }

    console.log('Expected values:')
    console.log('Command:', expectedCommand)
    console.log('Args:', expectedArgs)
    console.log('Options:', expectedOptions)

    const proc = spawk.spawn(
      expectedCommand,
      expectedArgs,
      expectedOptions
    )

    const result = await promiseSpawn.open(url) // Note: No command provided here

    console.log('Actual result:', result)

    t.hasStrict(result, {
      code: 0,
      signal: undefined,
    })

    t.ok(proc.called, 'The spawn function was called')

    console.log('Actual values:')
    console.log('Command:', proc.calledWith.command)
    console.log('Args:', proc.calledWith.args)
    console.log('Options:', proc.calledWith.options)

    t.equal(proc.calledWith.command, expectedCommand, 'Correct command was used')
    t.same(proc.calledWith.args, expectedArgs, 'Correct arguments were used')
    t.same(proc.calledWith.options, expectedOptions, 'Correct options were used')
    t.ok(
      proc.calledWith.args.some((arg) => arg.includes('start')),
      'Default "start" command was used'
    )
  } catch (error) {
    console.error('Test error:', error)
    throw error
  } finally {
    // Restore original values
    Object.defineProperty(process, 'platform', { value: originalPlatform })
    process.env.ComSpec = originalComSpec
  }
})

t.test('open function uses provided command on Windows', async (t) => {
  const originalPlatform = process.platform
  const originalComSpec = process.env.ComSpec

  // Mock Windows environment
  Object.defineProperty(process, 'platform', { value: 'win32' })
  process.env.ComSpec = 'C:\\WINDOWS\\system32\\cmd.exe'

  try {
    const url = 'https://example.com'
    const customCommand = 'custom-browser'
    const expectedCommand = 'C:\\WINDOWS\\system32\\cmd.exe'
    const expectedArgs = ['/d', '/s', '/c', `${customCommand} ${url}`]
    const expectedOptions = {
      command: customCommand, // Add this line
      shell: true,
      windowsVerbatimArguments: true,
    }

    const proc = spawk.spawn(
      expectedCommand,
      expectedArgs,
      expectedOptions
    )

    const result = await promiseSpawn.open(url, { command: customCommand })

    t.hasStrict(result, {
      code: 0,
      signal: undefined,
    })

    t.ok(proc.called, 'The spawn function was called')
    t.equal(proc.calledWith.command, expectedCommand, 'Correct command was used')
    t.same(proc.calledWith.args, expectedArgs, 'Correct arguments were used')
    t.same(proc.calledWith.options, expectedOptions, 'Correct options were used')
    t.ok(
      proc.calledWith.args.some((arg) => arg.includes(customCommand)),
      'Custom command was used'
    )
  } catch (error) {
    console.error('Test error:', error)
    throw error
  } finally {
    // Restore original values
    Object.defineProperty(process, 'platform', { value: originalPlatform })
    process.env.ComSpec = originalComSpec
  }
})
