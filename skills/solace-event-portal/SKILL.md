---
name: solace-event-portal
description: Manage Solace Event Portal application domains, applications (and application versions), events (and event versions), schemas and (schema versions), and AsyncAPI specifications through the @tklein1801/esg-mcp service over STDIO. Use SOLACE_CLOUD_TOKEN for authentication and enable writes only with --allow-write.
---

# Solace Event Portal

Use the `@tklein1801/esg-mcp` MCP service over STDIO to inspect and maintain
Solace Event Portal resources. Read operations are available by default.
Create, update, and delete operations are exposed only when the MCP process is
started with `--allow-write`.

## MCP Configuration

Configure the MCP client to start the service with STDIO and pass the token as
an environment variable. STDIO does not use request headers.

```json
{
  "mcpServers": {
    "solace-event-portal": {
      "type": "stdio",
      "command": "npx",
      "args": ["@tklein1801/esg-mcp", "run", "--type", "stdio"],
      "env": {
        "SOLACE_CLOUD_TOKEN": "${SOLACE_CLOUD_TOKEN}"
      }
    }
  }
}
```

For write operations, add `--allow-write`:

```json
{
  "args": ["@tklein1801/esg-mcp", "run", "--type", "stdio", "--allow-write"]
}
```

The package currently supports `--type stdio`, `--allow-write`, `--verbose`,
and `--silent`. Pin the npm package version when reproducibility is required,
for example `@tklein1801/esg-mcp@1.2.0`.

## Operating Rules

1. Read before writing. Resolve existing IDs and versions with the relevant
   `get_*` tool instead of guessing names or IDs.
2. Establish the application domain first. Use its ID for applications, events,
   and schemas.
3. Create the reusable schema before creating an event version that references
   it.
4. Create the event before creating its event version.
5. Create the application before creating its application version.
6. Link application versions to event version IDs through declared produced or
   consumed event version IDs.
7. Treat every write as a real Event Portal change. Confirm scope, target
   domain, names, versions, and IDs before calling create, update, or delete.
8. After a write, read the affected resource or version again and verify the
   returned IDs and relationships.

Never expose `SOLACE_CLOUD_TOKEN` in tool arguments, logs, summaries, or code.
Do not enable `--allow-write` for read-only discovery or planning.

## Resource Model and Creation Order

Use this dependency order for a new event model:

```text
Application Domain
├── Topic Domain (optional)
├── Schema
│   └── Schema Version with AsyncAPI 3 structured content
├── Event
│   └── Event Version referencing the Schema Version
└── Application
    └── Application Version declaring produced/consumed Event Versions
```

An event version can additionally define a delivery address. A topic domain is
useful when the application domain enforces topic-domain prefixes.

## Application Domains

Read with `get_application_domains` and `get_application_domain`. Topic
domains are read with `get_topic_domains` and `get_topic_domain`.

Create with `create_application_domain` using:

- `name`: required domain name.
- `description`: optional description.
- `topicDomainEnforcementEnabled`: optionally require addresses to use a
  configured topic domain.
- `uniqueTopicAddressEnforcementEnabled`: optionally require unique topic
  addresses.

When needed, create a topic domain with `create_topic_domain` using
`applicationDomainId`, `brokerType`, and an optional slash-separated
`baseTopicDomain`, such as `tchibo/sap/ae`.

Update with `update_application_domain`. Delete only after checking dependent
resources and explicit user intent.

## Schemas

Use `get_schemas`, `get_schema`, `get_schema_versions`, and
`get_schema_version` for discovery. Use `create_schema` and
`create_schema_version` for new assets, and the corresponding update/delete
tools only when requested.

`create_schema` requires `applicationDomainId`, `name`, `schemaType`, and
`shared`. Use `jsonSchema` for AsyncAPI JSON Schema content. Set `shared`
intentionally when the schema is shared across application domains.

`create_schema_version` requires `schemaId`, `version`, and optional string
`content`. The content is stringified YAML or JSON, not an in-memory object.
Use `stringify_json_schema` when a JSON object must be serialized first.

Always store schema content in AsyncAPI 3 structured format. Do not write the
old S4 EEE AsyncAPI 2 unstructured document as the canonical Event Portal
schema content.

## Events and Event Versions

Use `get_events`, `get_event`, `get_event_versions`, and `get_event_version` for
discovery. Use `create_event` and `create_event_version` to create resources,
and update/delete tools only with explicit intent.

`create_event` requires `applicationDomainId`, `name`, `brokerType`, and
`shared`; `requiresApproval` is optional.

`create_event_version` requires `eventId`, `version`, and `schemaVersionId`,
which must point to an existing structured AsyncAPI schema version.

Optional `eventAddress` contains a broker type, address type, and a
slash-separated topic:

```json
{
  "brokerType": "solace",
  "addressType": "topic",
  "topic": "tchibo/sap/ae/demo/event/1"
}
```

Use the exact enum values accepted by the connected Event Portal API and obey
the application domain's topic policies.

## Applications and Versions

Use `get_applications`, `get_application`, `get_applications_versions`, and
`get_application_version` for discovery. Use `create_application` and
`create_application_version` to create resources.

`create_application` requires `applicationDomainId`, `name`,
`applicationType` (currently `standard`), and `brokerType`.

`create_application_version` requires `applicationId` and `version`. Use the
optional `displayName` and `description`, and connect the application to event
versions with:

- `producedEventVersionIds`
- `consumedEventVersionIds`

These values must be event version IDs, not event IDs or names. Application
consumers can additionally be maintained with the `*_application_consumer`
tools. A consumer uses a name, broker type, consumer type (`eventQueue` or
`directClient`), and optional topic subscriptions.

## AsyncAPI Migration

The always-available `migrate_asyncapi` tool works locally without starting an
additional CLI process. It accepts:

- `content`: AsyncAPI JSON or YAML text.
- `action`: `to-structured` or `to-unstructured`.
- `format`: optional `yaml` or `json` output format.

Use `to-structured` for the canonical Event Portal representation and
`to-unstructured` only when an S4 EEE-Framework-compatible AsyncAPI 2.x
document is explicitly needed. The migration convention is:

- AsyncAPI 2 `subscribe` becomes AsyncAPI 3 `send`.
- AsyncAPI 2 `publish` becomes AsyncAPI 3 `receive`.
- Structured CloudEvent attributes and business data share one payload
  envelope; business data is under `payload.data`.
- Unstructured CloudEvents keep context in headers and business data in the
  payload.

Validate the returned `asyncapi` version, channels, operations, messages,
components, and references before persisting it. External or circular schema
references and unsupported constructs may require manual review.

## Writing Structured Schemas

Store the schema content that describes the structured CloudEvent envelope. A
minimal JSON Schema shape is:

```yaml
type: object
required:
  - specversion
  - id
  - source
  - type
  - data
properties:
  specversion:
    type: string
    const: '1.0'
  id:
    type: string
  source:
    type: string
  type:
    type: string
  datacontenttype:
    type: string
    const: application/json
  data:
    type: object
```

In a complete AsyncAPI 3 document, the envelope is normally referenced from a
message payload and operations reference channels and messages. Preserve the
full structured AsyncAPI document when that is the agreed Event Portal schema
representation; do not flatten it to only the business payload.

## Verification and Safety

- Confirm STDIO connectivity and `SOLACE_CLOUD_TOKEN` authentication.
- Confirm write mode before attempting mutations.
- Confirm domain, topic domain, IDs, versions, and enum values.
- Confirm schema type is `jsonSchema` and content is structured AsyncAPI.
- Confirm event versions reference schema version IDs.
- Confirm application versions reference event version IDs.
- Re-read every created or updated resource and version.
- Never invent IDs, versions, topic addresses, or relationships.
- Do not delete resources to resolve duplicate names; inspect and ask first.
- Do not use `strict-ssl=false`. For certificate-chain issues, use an approved
  CA bundle through `NODE_EXTRA_CA_CERTS` or npm's `cafile`.
