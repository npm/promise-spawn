# Changelog

## [7.0.0](https://github.com/npm/promise-spawn/compare/v6.0.2...v7.0.0) (2023-08-30)

### ⚠️ BREAKING CHANGES

* support for node 14 has been removed

### Bug Fixes

* [`bc0bb5f`](https://github.com/npm/promise-spawn/commit/bc0bb5f6183743b4253608275b1dbf7b9cc67f6c) [#71](https://github.com/npm/promise-spawn/pull/71) drop node14 support (@wraithgar)

### Dependencies

* [`e8606c7`](https://github.com/npm/promise-spawn/commit/e8606c7d0b068cd3d67b6f0bdc7605609a1dc321) [#71](https://github.com/npm/promise-spawn/pull/71) bump which from 3.0.1 to 4.0.0

## [6.0.2](https://github.com/npm/promise-spawn/compare/v6.0.1...v6.0.2) (2022-12-12)

### Bug Fixes

* [`38f272a`](https://github.com/npm/promise-spawn/commit/38f272ab994c8896e5c36efa96c5d1ec0ece3161) [#56](https://github.com/npm/promise-spawn/pull/56) correctly identify more wsl distributions, closes npm/cli#5903 (#56) (@nlf)

## [6.0.1](https://github.com/npm/promise-spawn/compare/v6.0.0...v6.0.1) (2022-11-01)

### Dependencies

* [`b9b7a78`](https://github.com/npm/promise-spawn/commit/b9b7a788abc5cdc0b63be3f4d241ad723ef82676) [#50](https://github.com/npm/promise-spawn/pull/50) `which@3.0.0` (#50)

## [6.0.0](https://github.com/npm/promise-spawn/compare/v5.0.0...v6.0.0) (2022-11-01)

### ⚠️ BREAKING CHANGES

* stdout and stderr will now be returned as strings by default, for buffers set stdioString to false
* when the `shell` option is set provided arguments will automatically be escaped

### Features

* [`6ab90b8`](https://github.com/npm/promise-spawn/commit/6ab90b886751c6c060bb8e4e05962185b41b648d) [#48](https://github.com/npm/promise-spawn/pull/48) switch stdioString default to true (#48) (@nlf)
* [`a854057`](https://github.com/npm/promise-spawn/commit/a854057456532fd9cfe1b38d88bc367760139ae1) [#47](https://github.com/npm/promise-spawn/pull/47) add open method for using system default apps to open arguments (#47) (@nlf)
* [`723fc32`](https://github.com/npm/promise-spawn/commit/723fc3200958c4b7b98328ee02269506fba253ba) [#44](https://github.com/npm/promise-spawn/pull/44) implement argument escaping when the `shell` option is set (@nlf)

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
