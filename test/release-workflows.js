'use strict'

const t = require('tap')
const { readFileSync } = require('fs')
const { resolve } = require('path')
const { getPublishTag } = require('@npmcli/template-oss/lib/release/util.js')
const pkg = require('../package.json')

const major = Number(pkg.version.split('.')[0])
const workflow = name =>
  readFileSync(resolve(__dirname, '../.github/workflows', `${name}.yml`), 'utf8')

t.test('maintenance releases use the matching major tag', t => {
  const options = {
    backport: pkg.templateOSS.backport,
    defaultTag: 'latest',
  }
  const current = { backport: null, defaultTag: 'latest' }

  t.equal(pkg.templateOSS.backport, major)
  t.equal(pkg.templateOSS.publish, true)
  t.equal(getPublishTag(pkg.version, options), `latest-${major}`)
  t.equal(getPublishTag(`${major}.0.3-pre.0`, options), `prerelease-${major}`)
  t.equal(getPublishTag(`${major + 1}.0.0`, current), 'latest')
  t.equal(getPublishTag(`${major + 1}.0.0-pre.0`, current), `prerelease-${major + 1}`)
  t.end()
})

t.test('release jobs receive the maintenance configuration', t => {
  const runs = workflow('release').split('\n')
    .filter(line => line.trim().startsWith('run:'))

  for (const command of ['template-oss-release-please', 'template-oss-release-manager']) {
    const helpers = runs.filter(line => line.includes(`${command} `))
    t.equal(helpers.length, 1, `${command} runs exactly once`)
    for (const run of helpers) {
      t.match(run, `--backport="${major}"`)
      t.match(run, '--defaultTag="latest"')
    }
  }

  t.match(workflow('ci-release'), new RegExp(
    'workflow_dispatch:\\n    inputs:\\n      ref:\\n' +
    `        required: true\\n        type: string\\n        default: release/v${major}\\n`
  ))
  t.end()
})

t.test('publishing forwards the computed release tag', t => {
  const integration = workflow('release-integration')
  const publishSteps = integration.split('      - name: Publish\n')
  t.equal(publishSteps.length, 2, 'one Publish step')
  const publish = publishSteps[1] || ''
  const commands = publish.split('\n').map(line => line.trim())

  t.match(publish, 'RELEASES: ${{ inputs.releases }}')
  t.ok(commands.includes('for release in $(echo $RELEASES | jq -r \'.[] | @base64\'); do'))
  t.ok(commands.includes(
    'PUBLISH_TAG=$(echo "$release" | base64 --decode | jq -r .publishTag)'
  ))
  t.same(commands.filter(line => /^npm publish(?:\s|$)/.test(line)), [
    'npm publish --provenance --tag="$PUBLISH_TAG"',
  ])
  t.end()
})
