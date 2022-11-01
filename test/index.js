'use strict'

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
    signal: null,
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
    signal: null,
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
    signal: null,
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
    signal: null,
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
    signal: null,
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
    signal: null,
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
    signal: null,
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
    signal: null,
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
      signal: null,
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
      signal: null,
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
      signal: null,
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
      signal: null,
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
      signal: null,
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
    signal: null,
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
    signal: null,
    stdout: '',
    stderr: '',
  })

  t.ok(proc.called)
})
