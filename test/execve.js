'use strict'

const t = require('tap')
const which = require('which')

const promiseSpawn = require('../lib/index.js')

const mockProcess = (t, overrides = {}) => {
  const calls = { execve: [], chdir: [], blocking: [] }
  const stream = (name) => ({
    write: (chunk, cb) => cb(),
    _handle: { setBlocking: (value) => calls.blocking.push([name, value]) },
  })
  const orig = {}
  const props = {
    platform: 'linux',
    execve: (...args) => calls.execve.push(args),
    chdir: (dir) => calls.chdir.push(dir),
    stdin: stream('stdin'),
    stdout: stream('stdout'),
    stderr: stream('stderr'),
    ...overrides,
  }
  for (const [key, value] of Object.entries(props)) {
    orig[key] = Object.getOwnPropertyDescriptor(process, key)
    Object.defineProperty(process, key, { value, configurable: true, writable: true })
  }
  t.teardown(() => {
    for (const [key, desc] of Object.entries(orig)) {
      if (desc) {
        Object.defineProperty(process, key, desc)
      } else {
        delete process[key]
      }
    }
  })
  return calls
}

t.test('canExecve', async (t) => {
  t.test('true on posix with process.execve', async (t) => {
    mockProcess(t)
    t.equal(promiseSpawn.canExecve(), true)
  })

  t.test('false on windows', async (t) => {
    mockProcess(t, { platform: 'win32' })
    t.equal(promiseSpawn.canExecve(), false)
  })

  t.test('false without process.execve', async (t) => {
    mockProcess(t, { execve: undefined })
    t.equal(promiseSpawn.canExecve(), false)
  })
})

t.test('execve', async (t) => {
  const sh = which.sync('sh')
  const echo = which.sync('echo')

  t.test('replaces the process with a shell running the escaped command', async (t) => {
    const calls = mockProcess(t)
    const env = { PATH: process.env.PATH, FOO: 'bar' }
    await promiseSpawn.execve('echo', ['hello world', '$HOME'], { shell: true, env, cwd: '/tmp' })
    t.same(calls.execve, [[sh, ['sh', '-c', `echo 'hello world' '$HOME'`], env]])
    t.same(calls.chdir, ['/tmp'])
    t.same(calls.blocking, [['stdin', true], ['stdout', true], ['stderr', true]])
  })

  t.test('uses a custom shell', async (t) => {
    const calls = mockProcess(t)
    await promiseSpawn.execve('echo', [], { shell: 'sh' })
    t.same(calls.execve, [[sh, ['sh', '-c', 'echo'], process.env]])
  })

  t.test('runs the command directly without a shell', async (t) => {
    const calls = mockProcess(t)
    await promiseSpawn.execve('echo', ['hello world'])
    t.same(calls.execve, [[echo, ['echo', 'hello world'], process.env]])
    t.same(calls.chdir, [])
  })

  t.test('defaults args to an empty list', async (t) => {
    const calls = mockProcess(t)
    await promiseSpawn.execve('echo')
    t.same(calls.execve, [[echo, ['echo'], process.env]])
  })

  t.test('falls back to process.env.PATH when env has none', async (t) => {
    const calls = mockProcess(t)
    await promiseSpawn.execve('echo', [], { env: { FOO: 'bar' } })
    t.same(calls.execve, [[echo, ['echo'], { FOO: 'bar' }]])
  })

  t.test('skips streams without a blocking toggle', async (t) => {
    const calls = mockProcess(t, {
      stdin: {},
      stdout: { write: (chunk, cb) => cb() },
      stderr: { write: (chunk, cb) => cb(), _handle: {} },
    })
    await promiseSpawn.execve('echo')
    t.same(calls.blocking, [])
    t.equal(calls.execve.length, 1)
  })

  t.test('rejects when the command cannot be found', async (t) => {
    const calls = mockProcess(t)
    await t.rejects(promiseSpawn.execve('no-such-command-xyz', [], { env: { PATH: '/nonexistent' } }), {
      code: 'ENOENT',
    })
    t.same(calls.execve, [])
  })
})
