# Versioning and releases

The CLI, webapp, MCP service, and workspace packages use one shared version.
Concourse stores the version in the `version` file on the `version` branch,
using the Semver resource with its Git driver.

## Build versions

The Concourse `build` job obtains the next `rc` prerelease version, runs the
project build and tests, then validates the webapp Docker image without
publishing it. A successful build persists the version to the `version` branch.

## Releases

After a successful build, run one of these Concourse jobs manually:

- `release-patch`
- `release-minor`
- `release-major`

The selected job bumps the version and builds the project. It then publishes
the CLI and MCP packages to npm, creates a webapp Docker image, and creates a
GitHub release. These publication steps run in parallel, so a failure in one
publication can occur after another output or the version has already updated.

## Initial setup

The semver resource uses `1.3.1` as its initial version. Its Git driver expects
a `version` branch and a `version` file in the repository. Ensure that branch
and file exist before running the pipeline, with a value matching the intended
current project version.
