# Event Specification Gedoens

## About the project

### General introduction

Event Specification Gedoens is a command-line tool for inspecting JSON-based AsyncAPI specifications and migrating them between AsyncAPI 2.x with unstructured CloudEvents and AsyncAPI 3.x with structured CloudEvents.

### Features

- List published and consumed events.
- List message and schema components.
- Migrate AsyncAPI 2.x unstructured CloudEvents to AsyncAPI 3.x structured CloudEvents.
- Migrate AsyncAPI 3.x structured CloudEvents back to AsyncAPI 2.x unstructured CloudEvents.
- Control console logging with verbose and silent modes.

### How to use

The project requires Node.js 20 or newer and npm. Install the dependencies and build the CLI:

```sh
npm install
npm run build
npm link
```

`npm link` makes the CLI available locally. Run a command with one of the supported executable names, such as `esg`:

```sh
esg list-events asyncapi.json
esg list-messages asyncapi.json
esg list-schemas asyncapi.json
esg migrate to-structured asyncapi.json
esg migrate to-unstructured asyncapi.json
```

Use `--verbose` for debug output or `--silent` to suppress logs. Run `esg --help` for the complete CLI reference.

## Documentation

- [Structured and unstructured CloudEvents](docs/structured-vs-unstructured.md)
- [Migration command reference](docs/migrate-command.md)

## Developing

### Clone the repository

```sh
git clone https://github.com/tklein1801/event-specification-gedoens.git
cd event-specification-gedoens
npm install
```

Useful development commands include:

```sh
npm run typecheck
npm run lint
npm run format:check
npm run test:run
npm run build
```

### CI/CD

#### `ci.yml`

The [CI workflow](.github/workflows/ci.yml) runs for every push. It installs dependencies with `npm ci`, lints the codebase, and builds the project using Node.js 22.

#### Versioning

Releases are created from `main` by [Semantic Release](https://semantic-release.gitbook.io/semantic-release/) through the [release workflow](.github/workflows/release.yml). The project follows semantic versioning based on Conventional Commit types:

- Breaking changes create a major release.
- `feat` commits create a minor release.
- `fix`, `perf`, `refactor`, and `revert` commits create a patch release.
- Documentation, style, test, build, CI, and routine chore commits do not create a release.

## Credits

The command-line interface is built with [`@drizzle-team/brocli`](https://www.npmjs.com/package/@drizzle-team/brocli).

## License

This project is licensed under the [MIT License](LICENSE).
