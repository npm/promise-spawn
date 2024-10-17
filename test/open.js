'use strict'

const spawk = require('spawk')
const t = require('tap')
const os = require('node:os')

const promiseSpawn = require('../lib/index.js')

spawk.preventUnmatched()
t.afterEach(() => {
  spawk.clean()
})

const isWSL = process.platform === 'linux' && os.release().toLowerCase().includes('microsoft')

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
      { shell: false })

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
      { shell: false })

    const result = await promiseSpawn.open('https://google.com', { shell: false })
    t.hasStrict(result, {
      code: 0,
      signal: undefined,
    })

    t.ok(proc.called)
  })

  t.test('respects opts.command', async (t) => {
    const proc = spawk.spawn('C:\\Windows\\System32\\cmd.exe',
      ['/d', '/s', '/c', 'browser https://google.com'],
      { shell: false })

    const result = await promiseSpawn.open('https://google.com', { command: 'browser' })
    t.hasStrict(result, {
      code: 0,
      signal: undefined,
    })

    t.ok(proc.called)
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
    const proc = spawk.spawn('sh', ['-c', 'open https://google.com'], { shell: false })

    const result = await promiseSpawn.open('https://google.com')
    t.hasStrict(result, {
      code: 0,
      signal: undefined,
    })

    t.ok(proc.called)
  })

  t.test('ignores shell = false', async (t) => {
    const proc = spawk.spawn('sh', ['-c', 'open https://google.com'], { shell: false })

    const result = await promiseSpawn.open('https://google.com', { shell: false })
    t.hasStrict(result, {
      code: 0,
      signal: undefined,
    })

    t.ok(proc.called)
  })

  t.test('respects opts.command', async (t) => {
    const proc = spawk.spawn('sh', ['-c', 'browser https://google.com'], { shell: false })

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

  // xdg-open is not installed in WSL by default
  t.test('uses xdg-open in a shell', { skip: isWSL }, async (t) => {
    const proc = spawk.spawn('sh', ['-c', 'xdg-open https://google.com'], { shell: false })

    const result = await promiseSpawn.open('https://google.com')
    t.hasStrict(result, {
      code: 0,
      signal: undefined,
    })

    t.ok(proc.called)
  })

  // xdg-open is not installed in WSL by default
  t.test('ignores shell = false', { skip: isWSL }, async (t) => {
    const proc = spawk.spawn('sh', ['-c', 'xdg-open https://google.com'], { shell: false })

    const result = await promiseSpawn.open('https://google.com', { shell: false })
    t.hasStrict(result, {
      code: 0,
      signal: undefined,
    })

    t.ok(proc.called)
  })

  t.test('respects opts.command', async (t) => {
    const proc = spawk.spawn('sh', ['-c', 'browser https://google.com'], { shell: false })

    const result = await promiseSpawn.open('https://google.com', { command: 'browser' })
    t.hasStrict(result, {
      code: 0,
      signal: undefined,
    })

    t.ok(proc.called)
  })

  t.test('when os.release() includes Microsoft treats as WSL', async (t) => {
    const promiseSpawnMock = t.mock('../lib/index.js', {
      os: {
        release: () => 'Microsoft',
      },
    })
    const browser = process.env.BROWSER
    process.env.BROWSER = '/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe'

    const proc = spawk.spawn('sh', ['-c', 'sensible-browser https://google.com'], { shell: false })

    const result = await promiseSpawnMock.open('https://google.com')
    t.hasStrict(result, {
      code: 0,
      signal: undefined,
    })

    t.teardown(() => {
      process.env.BROWSER = browser
    })

    t.ok(proc.called)
  })

  t.test('when os.release() includes microsoft treats as WSL', async (t) => {
    const promiseSpawnMock = t.mock('../lib/index.js', {
      os: {
        release: () => 'microsoft',
      },
    })
    const browser = process.env.BROWSER
    process.env.BROWSER = '/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe'

    const proc = spawk.spawn('sh', ['-c', 'sensible-browser https://google.com'], { shell: false })

    const result = await promiseSpawnMock.open('https://google.com')
    t.hasStrict(result, {
      code: 0,
      signal: undefined,
    })

    t.teardown(() => {
      process.env.BROWSER = browser
    })

    t.ok(proc.called)
  })

  t.test('fails on WSL if BROWSER is not set', async (t) => {
    const promiseSpawnMock = t.mock('../lib/index.js', {
      os: {
        release: () => 'microsoft',
      },
    })
    const browser = process.env.BROWSER
    delete process.env.BROWSER

    const proc = spawk.spawn('sh', ['-c', 'sensible-browser https://google.com'], { shell: false })

    await t.rejects(promiseSpawnMock.open('https://google.com'), {
      message: 'Set the BROWSER environment variable to your desired browser.',
    })

    t.teardown(() => {
      process.env.BROWSER = browser
    })

    t.notOk(proc.called)
  })

  t.end()
})

// this covers anything that is not win32, darwin or linux
t.test('process.platform === freebsd', (t) => {
  const platformDesc = Object.getOwnPropertyDescriptor(process, 'platform')
  Object.defineProperty(process, 'platform', { ...platformDesc, value: 'freebsd' })
  t.teardown(() => {
    Object.defineProperty(process, 'platform', platformDesc)
  })

  t.test('uses xdg-open with a shell', async (t) => {
    const proc = spawk.spawn('sh', ['-c', 'xdg-open https://google.com'], { shell: false })

    const result = await promiseSpawn.open('https://google.com')
    t.hasStrict(result, {
      code: 0,
      signal: undefined,
    })

    t.ok(proc.called)
  })

  t.test('ignores shell = false', async (t) => {
    const proc = spawk.spawn('sh', ['-c', 'xdg-open https://google.com'], { shell: false })

    const result = await promiseSpawn.open('https://google.com', { shell: false })
    t.hasStrict(result, {
      code: 0,
      signal: undefined,
    })

    t.ok(proc.called)
  })

  t.test('respects opts.command', async (t) => {
    const proc = spawk.spawn('sh', ['-c', 'browser https://google.com'], { shell: false })

    const result = await promiseSpawn.open('https://google.com', { command: 'browser' })
    t.hasStrict(result, {
      code: 0,
      signal: undefined,
    })

    t.ok(proc.called)
  })

  t.end()
})
