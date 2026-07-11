# event-schema-ged-ns

## Getting started

### Prerequisites

- Node.js 20 or newer
- npm

### Installation

Install all dependencies:

```sh
npm install
```

The `prepare` script runs Husky automatically after installation and installs the Git hooks.

### Development

Run the available checks locally:

```sh
npm run typecheck
npm run lint
npm run format:check
```

Format the project:

```sh
npm run format
```

Fix lint issues where possible:

```sh
npm run lint:fix
```

Build the project:

```sh
npm run build
```

### Logging

Command output is written to the console through the project logger. The log level and output format can be configured globally:

```sh
esg list-messages --log-level debug --log-format pretty
esg list-schemas --log-level info --log-format json
```

Supported log levels are `error`, `warn`, `info`, `debug`, and `silent`. Supported formats are the human-readable `pretty` format and machine-readable `json`.

`--verbose` is a shortcut for the `debug` level. `--silent` disables log output and takes precedence over both `--verbose` and `--log-level`.

## Code quality setup

This project uses a simple npm-based quality setup:

- **Prettier** formats the codebase.
- **Husky** installs Git hooks via the `prepare` npm script.
- **lint-staged** runs formatting and linting only on staged files before a commit.

The pre-commit hook runs:

```sh
npx lint-staged
```

The staged file rules are configured in `.lintstagedrc.json`.
