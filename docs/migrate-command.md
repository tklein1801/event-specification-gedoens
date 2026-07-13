# Migration command reference

The `migrate` command converts a JSON or YAML AsyncAPI specification between AsyncAPI 2.x with unstructured CloudEvents and AsyncAPI 3.x with structured CloudEvents. The same migration-core API powers the CLI and browser application. See [Structured and unstructured CloudEvents](structured-vs-unstructured.md) for the conceptual differences.

> The command overwrites the specified file only after the migration succeeds. Commit or back up production specifications before running it.

## Usage

```sh
esg migrate to-structured asyncapi.json
esg migrate to-unstructured asyncapi.json
```

The command alias is `m`. The input may be JSON, YAML, or YML. A successful migration overwrites the file using JSON for `.json` paths and YAML for `.yaml` or `.yml` paths.

## `to-structured`

This action expects an AsyncAPI 2.x document and applies the following changes:

1. Sets `asyncapi` to `3.0.0`.
2. Uses every existing channel key as the AsyncAPI 3 channel's `address`.
3. Converts `channels.<name>.subscribe` into a top-level operation with `action: send`.
4. Converts `channels.<name>.publish` into a top-level operation with `action: receive`.
5. Reuses existing `operationId` values as operation keys. Missing or duplicate identifiers are generated deterministically and without collisions.
6. Moves operation messages to `channels.<name>.messages` and references them from the operation. Special characters in JSON Pointers are escaped.
7. Converts each local message to a structured CloudEvent envelope:
   - The message payload references its schema in `components.schemas`, avoiding duplicate schema definitions.
   - CloudEvent attributes from `headers` and referenced message traits become properties of that schema.
   - The previous business payload becomes the schema's `properties.data`; local schema references are resolved recursively throughout `components.schemas`.
   - `specversion`, `id`, `source`, `type`, and `data` become required fields.
   - `contentType` becomes `application/cloudevents+json`.
   - Examples with separate `headers` and `payload` values become a single structured payload.
   - Schema components that are no longer referenced after recursive expansion are removed.
8. Removes migrated header traits from `components.messageTraits`. Other trait content remains attached to its message.
9. Preserves other document, channel, operation, message, and component fields.

## `to-unstructured`

This action expects an AsyncAPI 3.x document and applies the following changes:

1. Sets `asyncapi` to `2.0.0`.
2. Uses a channel's `address` as the AsyncAPI 2 channel key. If no address exists, it uses the logical channel name.
3. Converts top-level operations with `action: send` into `subscribe` operations.
4. Converts top-level operations with `action: receive` into `publish` operations.
5. Stores the top-level operation key as `operationId`.
6. Uses explicitly referenced operation messages. If an operation has no message list, it uses all messages from the referenced channel; multiple messages become `oneOf`.
7. Converts each local structured CloudEvent message to unstructured mode:
   - The referenced CloudEvent schema is reduced to its `properties.data` business schema, removing the CloudEvent attributes from the payload schema.
   - The message keeps a shallow payload reference to the resulting schema instead of embedding a deeply nested schema.
   - CloudEvent header schemas are collected in `components.messageTraits.CloudEventContext` and referenced by every migrated message.
   - Message-specific header constraints remain available on the message itself.
   - The remaining envelope fields become the header schema.
   - `datacontenttype.const` or `datacontenttype.default` determines the message `contentType`; the fallback is `application/json`.
   - Structured examples are split into `headers` and `payload` values.
8. Removes the top-level `operations` section from the AsyncAPI 2 result.

## Validation and limitations

The migration fails without changing the target file when, among other cases:

- The source version does not match the selected action.
- Channels, operations, or messages are not objects.
- An AsyncAPI 3 operation does not reference a top-level channel.
- Multiple logical channels use the same `address`.
- Multiple operations map to the same AsyncAPI 2 operation direction on one channel.
- A structured message does not define `payload.properties.data`.
- A structured target payload contains an external or circular schema reference that cannot be expanded into a finite, self-contained schema.

Transport and binding fields are preserved but are not rewritten for a specific protocol. Review server definitions and less common AsyncAPI 3 constructs, such as operation replies, after migration.
