'use strict'

const { writeFileSync: writeFile } = require('fs')
const { join } = require('path')
const t = require('tap')
const promiseSpawn = require('../lib/index.js')

const escape = require('../lib/escape.js')
const isWindows = process.platform === 'win32'

t.test('sh', (t) => {
  const expectations = [
    ['', `''`],
    ['test', 'test'],
    ['test words', `'test words'`],
    ['$1', `'$1'`],
    ['"$1"', `'"$1"'`],
    [`'$1'`, `\\''$1'\\'`],
    ['\\$1', `'\\$1'`],
    ['--arg="$1"', `'--arg="$1"'`],
    ['--arg=npm exec -c "$1"', `'--arg=npm exec -c "$1"'`],
    [`--arg=npm exec -c '$1'`, `'--arg=npm exec -c '\\''$1'\\'`],
    [`'--arg=npm exec -c "$1"'`, `\\''--arg=npm exec -c "$1"'\\'`],
  ]

  for (const [input, expectation] of expectations) {
    t.equal(escape.sh(input), expectation,
      `expected to escape \`${input}\` to \`${expectation}\``)
  }

  t.test('integration', { skip: isWindows && 'posix only' }, async (t) => {
    for (const [input] of expectations) {
      const p = await promiseSpawn('node', ['-p', 'process.argv[1]', '--', input],
        { shell: true, stdioString: true })
      const stdout = p.stdout.trim()
      t.equal(stdout, input, `expected \`${stdout}\` to equal \`${input}\``)
    }

    t.end()
  })

  t.end()
})

t.test('cmd', (t) => {
  const expectations = [
    ['', '""'],
    ['test', 'test'],
    ['%PATH%', '^%PATH^%'],
    ['%PATH%', '^^^%PATH^^^%', true],
    ['"%PATH%"', '^"\\^"^%PATH^%\\^"^"'],
    ['"%PATH%"', '^^^"\\^^^"^^^%PATH^^^%\\^^^"^^^"', true],
    [`'%PATH%'`, `'^%PATH^%'`],
    [`'%PATH%'`, `'^^^%PATH^^^%'`, true],
    ['\\%PATH%', '\\^%PATH^%'],
    ['\\%PATH%', '\\^^^%PATH^^^%', true],
    ['--arg="%PATH%"', '^"--arg=\\^"^%PATH^%\\^"^"'],
    ['--arg="%PATH%"', '^^^"--arg=\\^^^"^^^%PATH^^^%\\^^^"^^^"', true],
    ['--arg=npm exec -c "%PATH%"', '^"--arg=npm^ exec^ -c^ \\^"^%PATH^%\\^"^"'],
    ['--arg=npm exec -c "%PATH%"',
      '^^^"--arg=npm^^^ exec^^^ -c^^^ \\^^^"^^^%PATH^^^%\\^^^"^^^"', true],
    [`--arg=npm exec -c '%PATH%'`, `^"--arg=npm^ exec^ -c^ '^%PATH^%'^"`],
    [`--arg=npm exec -c '%PATH%'`, `^^^"--arg=npm^^^ exec^^^ -c^^^ '^^^%PATH^^^%'^^^"`, true],
    [`'--arg=npm exec -c "%PATH%"'`, `^"'--arg=npm^ exec^ -c^ \\^"^%PATH^%\\^"'^"`],
    [`'--arg=npm exec -c "%PATH%"'`,
      `^^^"'--arg=npm^^^ exec^^^ -c^^^ \\^^^"^^^%PATH^^^%\\^^^"'^^^"`, true],
    ['"C:\\Program Files\\test.bat"', '^"\\^"C:\\Program^ Files\\test.bat\\^"^"'],
    ['"C:\\Program Files\\test.bat"', '^^^"\\^^^"C:\\Program^^^ Files\\test.bat\\^^^"^^^"', true],
    ['"C:\\Program Files\\test%.bat"', '^"\\^"C:\\Program^ Files\\test^%.bat\\^"^"'],
    ['"C:\\Program Files\\test%.bat"',
      '^^^"\\^^^"C:\\Program^^^ Files\\test^^^%.bat\\^^^"^^^"', true],
    ['% % %', '^"^%^ ^%^ ^%^"'],
    ['% % %', '^^^"^^^%^^^ ^^^%^^^ ^^^%^^^"', true],
    ['hello^^^^^^', 'hello^^^^^^^^^^^^'],
    ['hello^^^^^^', 'hello^^^^^^^^^^^^^^^^^^^^^^^^', true],
    ['hello world', '^"hello^ world^"'],
    ['hello world', '^^^"hello^^^ world^^^"', true],
    ['hello"world', '^"hello\\^"world^"'],
    ['hello"world', '^^^"hello\\^^^"world^^^"', true],
    ['hello""world', '^"hello\\^"\\^"world^"'],
    ['hello""world', '^^^"hello\\^^^"\\^^^"world^^^"', true],
    ['hello\\world', 'hello\\world'],
    ['hello\\world', 'hello\\world', true],
    ['hello\\\\world', 'hello\\\\world'],
    ['hello\\\\world', 'hello\\\\world', true],
    ['hello\\"world', '^"hello\\\\\\^"world^"'],
    ['hello\\"world', '^^^"hello\\\\\\^^^"world^^^"', true],
    ['hello\\\\"world', '^"hello\\\\\\\\\\^"world^"'],
    ['hello\\\\"world', '^^^"hello\\\\\\\\\\^^^"world^^^"', true],
    ['hello world\\', '^"hello^ world\\\\^"'],
    ['hello world\\', '^^^"hello^^^ world\\\\^^^"', true],
    ['hello %PATH%', '^"hello^ ^%PATH^%^"'],
    ['hello %PATH%', '^^^"hello^^^ ^^^%PATH^^^%^^^"', true],
  ]

  for (const [input, expectation, double] of expectations) {
    const msg = `expected to${double ? ' double' : ''} escape \`${input}\` to \`${expectation}\``
    t.equal(escape.cmd(input, double), expectation, msg)
  }

  t.test('integration', { skip: !isWindows && 'Windows only' }, async (t) => {
    const dir = t.testdir()
    const shimFile = join(dir, 'shim.cmd')
    const shim = `@echo off\nnode -p process.argv[1] -- %*`
    writeFile(shimFile, shim)

    const spawnOpts = { shell: true, stdioString: true }
    for (const [input,, double] of expectations) {
      const p = double
        ? await promiseSpawn(shimFile, [input], spawnOpts)
        : await promiseSpawn('node', ['-p', 'process.argv[1]', '--', input], spawnOpts)
      t.equal(p.stdout, input, `expected \`${p.stdout}\` to equal \`${input}\``)
    }

    t.end()
  })

  t.end()
})
