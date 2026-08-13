# @tklein1801/esg-mcp

MCP (Model Context Protocol) service for Event Specification Management (ESG). It exposes CRUD operations for Applications, Application Domains, Events, and Schemas plus local AsyncAPI migrations as AI-callable tools over a Streamable-HTTP endpoint served by Express.

## Installation

```bash
npm install @tklein1801/esg-mcp
```

## Usage

Build and start the service from the repository workspace:

```bash
npm run build --workspace @tklein1801/esg-mcp
npm start --workspace @tklein1801/esg-mcp
```

The service exposes the MCP endpoint at `POST /mcp`. Requests can include an `Authorization: Bearer <token>` or `X-Api-Key: <api-key>` header. Alternatively, configure `SOLACE_CLOUD_TOKEN` when starting the service. Request headers take precedence over the environment variable.

## Available Tools

The package provides read-only tools for applications, application domains, events, and schemas. Create, update, and delete tools are disabled by default and can be enabled with `ALLOW_CREATE`, `ALLOW_UPDATE`, and `ALLOW_DELETE`.

The always-available `migrate_asyncapi` tool converts YAML or JSON AsyncAPI specifications between structured and unstructured CloudEvents:

- `to-structured`: AsyncAPI 2.x / unstructured → AsyncAPI 3.x / structured
- `to-unstructured`: AsyncAPI 3.x / structured → AsyncAPI 2.x / unstructured

It accepts `content`, `action`, and an optional `format` (`yaml` or `json`) and uses the same migration core as the webapp and CLI.

## Documentation

See the complete MCP service reference, including configuration, endpoints, authentication, and all available tools:

- [MCP service reference](https://github.com/tklein1801/event-specification-gedoens/blob/main/docs/mcp.md)

For local development, the same documentation is available at [`../../docs/mcp.md`](../../docs/mcp.md).

## License

This project is licensed under the [MIT License](../../LICENSE).
