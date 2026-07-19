# Versioning and releases

The project contains two independently versioned products:

- **CLI** (`@tklein1801/esg-cli`): validates and migrates AsyncAPI specifications and is published to npm.
- **Webapp** (`@tklein1801/esg-webapp`): browser application, private workspace package, not published to npm.

Changes to shared migration logic can affect both products; product-specific changes should release only the affected product.

## Semantic Versioning

Versions follow `MAJOR.MINOR.PATCH`:

- **PATCH**: backward-compatible fixes and improvements.
- **MINOR**: backward-compatible functionality.
- **MAJOR**: incompatible behavior, input, output, or API changes.

### Commit types

Releases use [Conventional Commits](https://www.conventionalcommits.org/):

| Commit type                                     | Version increase |
| ----------------------------------------------- | ---------------- |
| `feat`                                          | Minor            |
| `fix`, `perf`, `refactor`, `revert`             | Patch            |
| Breaking change (`BREAKING CHANGE:` or `!`)     | Major            |
| `docs`, `style`, `chore`, `test`, `build`, `ci` | None             |

Examples:

```text
fix(cli): correct migration help text
feat(webapp): add specification upload preview
feat!: remove the legacy migration option
```

The commit type matters even when the path is relevant: `fix(cli)` can release the CLI, while `chore(cli)` cannot.

## Product paths

Semantic Release filters each commit by its changed files.

| Product | Relevant paths                                                                                         |
| ------- | ------------------------------------------------------------------------------------------------------ |
| CLI     | `packages/cli`, `packages/migration-core`, root `package.json`, root `package-lock.json`               |
| Webapp  | `apps/webapp`, `packages/ui`, `packages/migration-core`, root `package.json`, root `package-lock.json` |

Changes to `packages/migration-core` or either root package file can therefore release both products. Their versions are calculated independently from their respective last tags.

## CI and release workflow

The regular CI workflow (`.github/workflows/ci.yml`) runs on pushes and pull requests. It installs dependencies, runs linting, typechecking, tests, and the production build. It does **not** change versions.

The release workflow (`.github/workflows/release.yml`) runs on pushes to `main` or manually. It repeats those checks and then runs:

```text
node scripts/release.cjs .releaserc.json
node scripts/release.cjs .releaserc.webapp.json
```

A release requires:

- execution on `main`,
- successful installation, linting, typechecking, tests, and build,
- at least one relevant release-capable commit since the product's last tag,
- the required GitHub and npm permissions.

The configurations are `.releaserc.json` (CLI) and `.releaserc.webapp.json` (webapp). The release script is `scripts/release.cjs`.

## Versions, tags, and publication

Product versions are stored in:

- `packages/cli/package.json`
- `apps/webapp/package.json`

Do not increase them manually. Semantic Release updates the package file, creates a release commit, updates `CHANGELOG.md`, and creates a product tag:

- CLI: `cli-v1.0.1`
- Webapp: `webapp-v1.0.0`

The CLI package is published to npm after a successful release. The webapp is not.

## Examples

Starting from `cli-v1.0.1`, this commit creates a CLI patch release:

```text
fix(cli): correct events help text
```

If it is merged to `main` and all checks pass:

```text
packages/cli/package.json: 1.0.1 -> 1.0.2
Tag: cli-v1.0.2
```

The webapp is unaffected. Conversely, a `fix(webapp)` under `apps/webapp` affects only the webapp.

A `fix(migration-core)` can create both a CLI and a webapp release.

## Manual runs and failures

The release workflow supports manual execution through `workflow_dispatch`. A local dry run is available:

```sh
RELEASE_DRY_RUN=true node scripts/release.cjs .releaserc.json
RELEASE_DRY_RUN=true node scripts/release.cjs .releaserc.webapp.json
```

The CLI release requires `GITHUB_TOKEN` and `NPM_TOKEN`; the webapp requires GitHub permissions but no npm publication token.

If a release fails, its previous tag remains unchanged, so the same next version may appear on every retry. Only a successful release creates the new tag. Tags must point to the commit on which their release is based; moving a tag changes the commit range Semantic Release analyzes.

Release commits contain `[skip ci]` to prevent another release loop.

## Release checklist

1. Change the correct product path.
2. Use the appropriate Conventional Commit type.
3. Wait for CI to pass.
4. Merge or push to `main`.
5. Verify the release workflow and generated tag.
6. Verify npm publication for a CLI release.
