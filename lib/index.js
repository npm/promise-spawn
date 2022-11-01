'use strict'

const { spawn } = require('child_process')
const which = require('which')

const escape = require('./escape.js')

// 'extra' object is for decorating the error a bit more
const promiseSpawn = (cmd, args, opts = {}, extra = {}) => {
  if (opts.shell) {
    return spawnWithShell(cmd, args, opts, extra)
  }

  let proc

  const p = new Promise((res, rej) => {
    proc = spawn(cmd, args, opts)

    const stdout = []
    const stderr = []

    const reject = er => rej(Object.assign(er, {
      cmd,
      args,
      ...stdioResult(stdout, stderr, opts),
      ...extra,
    }))

    proc.on('error', reject)

    if (proc.stdout) {
      proc.stdout.on('data', c => stdout.push(c)).on('error', reject)
      proc.stdout.on('error', er => reject(er))
    }

    if (proc.stderr) {
      proc.stderr.on('data', c => stderr.push(c)).on('error', reject)
      proc.stderr.on('error', er => reject(er))
    }

    proc.on('close', (code, signal) => {
      const result = {
        cmd,
        args,
        code,
        signal,
        ...stdioResult(stdout, stderr, opts),
        ...extra,
      }

      if (code || signal) {
        rej(Object.assign(new Error('command failed'), result))
      } else {
        res(result)
      }
    })
  })

  p.stdin = proc.stdin
  p.process = proc
  return p
}

const spawnWithShell = (cmd, args, opts, extra) => {
  let command = opts.shell
  // if shell is set to true, we use a platform default. we can't let the core
  // spawn method decide this for us because we need to know what shell is in use
  // ahead of time so that we can escape arguments properly. we don't need coverage here.
  if (command === true) {
    // istanbul ignore next
    command = process.platform === 'win32' ? process.env.ComSpec : 'sh'
  }

  const options = { ...opts, shell: false }
  const realArgs = []
  let script = cmd

  // first, determine if we're in windows because if we are we need to know if we're
  // running an .exe or a .cmd/.bat since the latter requires extra escaping
  const isCmd = /(?:^|\\)cmd(?:\.exe)?$/i.test(command)
  if (isCmd) {
    let doubleEscape = false

    // find the actual command we're running
    let initialCmd = ''
    let insideQuotes = false
    for (let i = 0; i < cmd.length; ++i) {
      const char = cmd.charAt(i)
      if (char === ' ' && !insideQuotes) {
        break
      }

      initialCmd += char
      if (char === '"' || char === "'") {
        insideQuotes = !insideQuotes
      }
    }

    let pathToInitial
    try {
      pathToInitial = which.sync(initialCmd, {
        path: (options.env && options.env.PATH) || process.env.PATH,
        pathext: (options.env && options.env.PATHEXT) || process.env.PATHEXT,
      }).toLowerCase()
    } catch (err) {
      pathToInitial = initialCmd.toLowerCase()
    }

    doubleEscape = pathToInitial.endsWith('.cmd') || pathToInitial.endsWith('.bat')
    for (const arg of args) {
      script += ` ${escape.cmd(arg, doubleEscape)}`
    }
    realArgs.push('/d', '/s', '/c', script)
    options.windowsVerbatimArguments = true
  } else {
    for (const arg of args) {
      script += ` ${escape.sh(arg)}`
    }
    realArgs.push('-c', script)
  }

  return promiseSpawn(command, realArgs, options, extra)
}

const isPipe = (stdio = 'pipe', fd) => {
  if (stdio === 'pipe' || stdio === null) {
    return true
  }

  if (Array.isArray(stdio)) {
    return isPipe(stdio[fd], fd)
  }

  return false
}

const stdioResult = (stdout, stderr, { stdioString = true, stdio }) => {
  const result = {
    stdout: null,
    stderr: null,
  }

  // stdio is [stdin, stdout, stderr]
  if (isPipe(stdio, 1)) {
    result.stdout = Buffer.concat(stdout)
    if (stdioString) {
      result.stdout = result.stdout.toString().trim()
    }
  }

  if (isPipe(stdio, 2)) {
    result.stderr = Buffer.concat(stderr)
    if (stdioString) {
      result.stderr = result.stderr.toString().trim()
    }
  }

  return result
}

module.exports = promiseSpawn
