'use strict'

const spawk = require('spawk')
const t = require('tap')

const promiseSpawn = require('../lib/index.js')

spawk.preventUnmatched()
t.afterEach(() => {
  spawk.clean()
})

t.test('process.platform === win32', (t) => {
  const comSpec = process.env.ComSpec
  const platformDesc = Object.getOwnPropertyDescriptor(process, 'platform')
  process.env.ComSpec = 'C:\\Windows\\System32\\cmd.exe'
  Object.defineProperty(process, 'platform', { ...platformDesc, value: 'win32' })
  t.teardown(() => {
    process.env.ComSpec = comSpec
    Object.defineProperty(process, 'platform', platformDesc)
  })

  t.test('uses start with a shell', async (t) => {
    const proc = spawk.spawn('C:\\Windows\\System32\\cmd.exe',
      ['/d', '/s', '/c', 'start "" https://google.com'],
      { shell: true, windowsVerbatimArguments: true })

    const result = await promiseSpawn.open('https://google.com')
    t.hasStrict(result, {
      code: 0,
      signal: undefined,
    })

    t.ok(proc.called)
  })

  t.test('ignores shell = false', async (t) => {
    const proc = spawk.spawn('C:\\Windows\\System32\\cmd.exe',
      ['/d', '/s', '/c', 'start "" https://google.com'],
      { shell: true, windowsVerbatimArguments: true })

    const result = await promiseSpawn.open('https://google.com', { shell: false })
    t.hasStrict(result, {
      code: 0,
      signal: undefined,
    })

    t.ok(proc.called, 'spawn was called')
    t.equal(proc.calledWith.command, 'C:\\Windows\\System32\\cmd.exe', 'correct command was used')
    t.same(proc.calledWith.args, ['/d', '/s', '/c', 'start "" https://google.com'],
      'correct args were used')
    t.same(proc.calledWith.options, { shell: true, windowsVerbatimArguments: true },
      'shell: true and windowsVerbatimArguments: true were used despite passing shell: false')
  })

  t.test('respects opts.command', async (t) => {
    const customCommand = 'browser'
    const proc = spawk.spawn('C:\\Windows\\System32\\cmd.exe',
      ['/d', '/s', '/c', `${customCommand} https://google.com`],
      { command: customCommand, shell: true, windowsVerbatimArguments: true })

    const result = await promiseSpawn.open('https://google.com', { command: customCommand })
    t.hasStrict(result, {
      code: 0,
      signal: undefined,
    })

    t.ok(proc.called, 'spawn was called')
    t.equal(proc.calledWith.command, 'C:\\Windows\\System32\\cmd.exe', 'correct command was used')
    t.same(proc.calledWith.args, ['/d', '/s', '/c', `${customCommand} https://google.com`],
      'correct args were used')
    t.same(proc.calledWith.options, {
      command: customCommand,
      shell: true,
      windowsVerbatimArguments: true,
    }, 'correct options were used')
  })

  t.end()
})

t.test('process.platform === darwin', (t) => {
  const platformDesc = Object.getOwnPropertyDescriptor(process, 'platform')
  Object.defineProperty(process, 'platform', { ...platformDesc, value: 'darwin' })
  t.teardown(() => {
    Object.defineProperty(process, 'platform', platformDesc)
  })

  t.test('uses open with a shell', async (t) => {
    const proc = spawk.spawn('sh', ['-c', 'open https://google.com'], { shell: true })

    const result = await promiseSpawn.open('https://google.com')
    t.hasStrict(result, {
      code: 0,
      signal: undefined,
    })

    t.ok(proc.called)
  })

  t.test('ignores shell = false', async (t) => {
    const proc = spawk.spawn('sh', ['-c', 'open https://google.com'], { shell: true })

    const result = await promiseSpawn.open('https://google.com', { shell: false })
    t.hasStrict(result, {
      code: 0,
      signal: undefined,
    })

    t.ok(proc.called)
  })

  t.test('respects opts.command', async (t) => {
    const proc = spawk.spawn('sh', ['-c', 'browser https://google.com'], { shell: true })

    const result = await promiseSpawn.open('https://google.com', { command: 'browser' })
    t.hasStrict(result, {
      code: 0,
      signal: undefined,
    })

    t.ok(proc.called)
  })

  t.end()
})

t.test('process.platform === linux', (t) => {
  const platformDesc = Object.getOwnPropertyDescriptor(process, 'platform')
  Object.defineProperty(process, 'platform', { ...platformDesc, value: 'linux' })
  t.teardown(() => {
    Object.defineProperty(process, 'platform', platformDesc)
  })

  t.test('uses xdg-open in a shell', async (t) => {
    const proc = spawk.spawn('sh', ['-c', 'xdg-open https://google.com'], { shell: true })

    const result = await promiseSpawn.open('https://google.com')
    t.hasStrict(result, {
      code: 0,
      signal: undefined,
    })

    t.ok(proc.called)
  })

  t.test('ignores shell = false', async (t) => {
    const proc = spawk.spawn('sh', ['-c', 'xdg-open https://google.com'], { shell: true })

    const result = await promiseSpawn.open('https://google.com', { shell: false })
    t.hasStrict(result, {
      code: 0,
      signal: undefined,
    })

    t.ok(proc.called)
  })

  t.test('respects opts.command', async (t) => {
    const proc = spawk.spawn('sh', ['-c', 'browser https://google.com'], { shell: true })

    const result = await promiseSpawn.open('https://google.com', { command: 'browser' })
    t.hasStrict(result, {
      code: 0,
      signal: undefined,
    })

    t.ok(proc.called)
  })

  t.test('when os.release() includes Microsoft treats as win32', async (t) => {
    const comSpec = process.env.ComSpec
    process.env.ComSpec = 'C:\\Windows\\System32\\cmd.exe'
    t.teardown(() => {
      process.env.ComSPec = comSpec
    })

    const promiseSpawnMock = t.mock('../lib/index.js', {
      os: {
        release: () => 'Microsoft',
      },
    })

    const proc = spawk.spawn('C:\\Windows\\System32\\cmd.exe',
      ['/d', '/s', '/c', 'start "" https://google.com'],
      { shell: true })

    const result = await promiseSpawnMock.open('https://google.com')
    t.hasStrict(result, {
      code: 0,
      signal: undefined,
    })

    t.ok(proc.called)
  })

  t.test('when os.release() includes microsoft treats as win32', async (t) => {
    const comSpec = process.env.ComSpec
    process.env.ComSpec = 'C:\\Windows\\System32\\cmd.exe'
    t.teardown(() => {
      process.env.ComSPec = comSpec
    })

    const promiseSpawnMock = t.mock('../lib/index.js', {
      os: {
        release: () => 'microsoft',
      },
    })

    const proc = spawk.spawn('C:\\Windows\\System32\\cmd.exe',
      ['/d', '/s', '/c', 'start "" https://google.com'],
      { shell: true })

    const result = await promiseSpawnMock.open('https://google.com')
    t.hasStrict(result, {
      code: 0,
      signal: undefined,
    })

    t.ok(proc.called)
  })

  t.end()
})

// // this covers anything that is not win32, darwin or linux
t.test('process.platform === freebsd', (t) => {
  const platformDesc = Object.getOwnPropertyDescriptor(process, 'platform')
  Object.defineProperty(process, 'platform', { ...platformDesc, value: 'freebsd' })
  t.teardown(() => {
    Object.defineProperty(process, 'platform', platformDesc)
  })

  t.test('uses xdg-open with a shell', async (t) => {
    const proc = spawk.spawn('sh', ['-c', 'xdg-open https://google.com'], { shell: true })

    const result = await promiseSpawn.open('https://google.com')
    t.hasStrict(result, {
      code: 0,
      signal: undefined,
    })

    t.ok(proc.called)
  })

  t.test('ignores shell = false', async (t) => {
    const proc = spawk.spawn('sh', ['-c', 'xdg-open https://google.com'], { shell: true })

    const result = await promiseSpawn.open('https://google.com', { shell: false })
    t.hasStrict(result, {
      code: 0,
      signal: undefined,
    })

    t.ok(proc.called)
  })

  t.test('respects opts.command', async (t) => {
    const proc = spawk.spawn('sh', ['-c', 'browser https://google.com'], { shell: true })

    const result = await promiseSpawn.open('https://google.com', { command: 'browser' })
    t.hasStrict(result, {
      code: 0,
      signal: undefined,
    })

    t.ok(proc.called)
  })

  t.end()
})
