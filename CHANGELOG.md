# Changelog

## [5.0.0](https://github.com/npm/promise-spawn/compare/v4.0.0...v5.0.0) (2022-10-26)

### ⚠️ BREAKING CHANGES

* leading and trailing whitespace is no longer preserved when stdioStrings is set
* this module no longer attempts to infer a uid and gid for processes

### Features

* [`422e1b6`](https://github.com/npm/promise-spawn/commit/422e1b6005baa7ca3d5cd70180e3fbea0cf07dd9) [#40](https://github.com/npm/promise-spawn/pull/40) remove infer-owner (#40) (@nlf, @wraithgar)

### Bug Fixes

* [`0f3dc07`](https://github.com/npm/promise-spawn/commit/0f3dc07469226faec67550ebebad9abdfd5b63a9) [#42](https://github.com/npm/promise-spawn/pull/42) trim stdio strings before returning when stdioStrings is set (#42) (@nlf)

## [4.0.0](https://github.com/npm/promise-spawn/compare/v3.0.0...v4.0.0) (2022-10-10)

### ⚠️ BREAKING CHANGES

* `@npmcli/promise-spawn` is now compatible with the following semver range for node: `^14.17.0 || ^16.13.0 || >=18.0.0`

### Features

* [`4fba970`](https://github.com/npm/promise-spawn/commit/4fba970efe7ad586cd3c4a817fc10d364dee7421) [#29](https://github.com/npm/promise-spawn/pull/29) postinstall for dependabot template-oss PR (@lukekarrys)

## [3.0.0](https://github.com/npm/promise-spawn/compare/v2.0.1...v3.0.0) (2022-04-05)


### ⚠ BREAKING CHANGES

* this will drop support for node 10 and non-LTS versions of node 12 and node 14

### Bug Fixes

* put infer-owner back in ([#12](https://github.com/npm/promise-spawn/issues/12)) ([cb4a487](https://github.com/npm/promise-spawn/commit/cb4a4879e00deb6f5527d5b193a1d647a28a1cb4))


### Dependencies

* @npmcli/template-oss@3.2.2 ([#10](https://github.com/npm/promise-spawn/issues/10)) ([ad35767](https://github.com/npm/promise-spawn/commit/ad357670149ad5ab7993002ea8a82bc85f9deeaa))
