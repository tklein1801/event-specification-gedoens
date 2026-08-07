# Event Specification Gedoens

Event Specification Gedoens is a Turborepo containing a command-line tool and a fully client-side React application for inspecting and migrating AsyncAPI specifications. Both surfaces use one shared migration engine, so JSON and YAML documents are transformed identically.

## Monorepo structure

```text
apps/
└── webapp/              React, Vite and Tailwind browser application
packages/
├── cli/                 Published `@tklein1801/esg-cli` CLI
├── migration-core/      Browser- and CLI-safe parsing and migration API
├── ui/                  Shared shadcn/ui components and design tokens
├── eslint-config/       Shared flat ESLint configurations
└── typescriptconfig/    Shared TypeScript configurations
```

The root uses npm Workspaces and Turborepo. Package builds run before dependent app and CLI tasks, and generated `dist/` folders are cached locally by Turbo.

## Requirements and installation

- Node.js 20.19 or newer (Node.js 22 is used in CI)
- npm 11

```sh
git clone https://github.com/tklein1801/event-specification-gedoens.git
cd event-specification-gedoens
npm install
```

## Development commands

Run all commands from the repository root:

```sh
npm run dev          # start workspace development processes (including Vite)
npm run build        # build all apps and packages
npm run test         # run all Vitest suites once
npm run lint         # lint all source and test files
npm run typecheck    # type-check every workspace
npm run format       # format the repository
```

Target an individual workspace when needed:

```sh
npm run dev --workspace @tklein1801/esg-webapp
npm run test --workspace @event-specification-gedoens/migration-core
npm run build --workspace @tklein1801/esg-cli
```

## Web application

Start the local application with `npm run dev` and open the Vite URL shown in the terminal. The responsive two-column interface supports:

- pasted JSON or YAML; duplicate JSON object keys are accepted and the last value is retained;
- `.json`, `.yaml`, and `.yml` file uploads;
- both migration directions;
- validation, loading, success, and error states;
- formatted results, clipboard copy, and local download.

Migration happens entirely in the browser. Specifications are never uploaded to a server.

## CLI

Build and link the CLI locally:

```sh
npm run build --workspace @tklein1801/esg-cli
npm link --workspace @tklein1801/esg-cli
```

Use any of the executable aliases (`esg`, `event-schema-gedoens`, or `event-specification-gedoens`):

```sh
esg list-events asyncapi.yaml
esg list-messages asyncapi.json
esg list-schemas asyncapi.yaml
esg migrate to-structured asyncapi.yaml
esg migrate to-unstructured asyncapi.json
```

Migration overwrites the supplied file after a successful transformation and preserves JSON/YAML based on the file extension. Use `--verbose` for debug output, `--silent` to suppress logs, and `esg --help` for the complete command reference.

## Shared migration core

`@event-specification-gedoens/migration-core` contains every parser, validator, navigator, CloudEvent transformer, and serializer used by the CLI and web app. It has no React, CLI, filesystem, or other Node-specific dependency.

Its public API accepts a YAML/JSON string or an object:

```ts
import { migrateAsyncApi, migrateAsyncApiText } from '@event-specification-gedoens/migration-core';

const document = migrateAsyncApi(sourceObject, 'to-structured');
const { content } = migrateAsyncApiText(yamlSource, 'to-unstructured');
```

Invalid input is reported as `InvalidAsyncApiSpecification` with a stable error code. See [the migration reference](docs/migrate-command.md) for transformation details and limitations.

## Adding apps or packages

Create a directory under `apps/` or `packages/` with its own `package.json`. Extend a configuration from `@event-specification-gedoens/typescript-config`, consume the shared ESLint config, and expose any of `build`, `dev`, `test`, `lint`, and `typecheck` that apply. Turbo discovers the workspace automatically through the root `workspaces` declaration.

Reusable React components belong in `packages/ui`, not in an individual app. Its `components.json`, Tailwind source scanning, CSS variables, and shadcn-compatible aliases keep generated components shared.

## CI and releases

The CI workflow uses npm Workspaces and Turbo caching, then runs `npm ci`, lint, typecheck, tests, and the production build. On pushes to `main`, the release workflow repeats these gates and runs path-aware Semantic Release for the CLI, webapp, and MCP service independently. Conventional Commits determine the version increment (`feat` = minor, `fix`/`refactor` = patch, breaking changes = major); only packages touched by a commit are released. All releases update the central `CHANGELOG.md`, while `packages/cli` is published as `@tklein1801/esg-cli` and `apps/mcp` is published as `@tklein1801/esg-mcp`.

## Documentation

- [Migration command reference](docs/migrate-command.md)
- [Structured and unstructured CloudEvents](docs/structured-vs-unstructured.md)

## License

This project is licensed under the [MIT License](LICENSE).

## Known issues

- Das Solace EP SDK nicht ganz aktuell (verwendete Version ~2 Jahre alt) und besitzt leider in manchen Bereichen nicht die aktuellsten Payloads und Features.

### Events

- Beim erstellen und aktualisieren eines Events wird der `brokerType` nicht korrekt gesetzt und bleibt immer leer.
