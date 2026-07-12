# Event Specification Gedoens CLI

The CLI inspects JSON and YAML AsyncAPI specifications and migrates CloudEvents between AsyncAPI 2.x unstructured mode and AsyncAPI 3.x structured mode.

```sh
npx @tklein1801/esg-cli migrate to-structured asyncapi.yaml
npx @tklein1801/esg-cli migrate to-unstructured asyncapi.json
```

The package also installs the shorter `esg` and `event-schema-gedoens` aliases. See the [repository documentation](https://github.com/tklein1801/event-specification-gedoens) for all commands, migration rules, and development instructions.
