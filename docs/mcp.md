# @tklein1801/esg-mcp

MCP (Model Context Protocol) service for Event Specification Management (ESG). Exposes CRUD operations for Applications, Application Domains, Events, and Schemas plus local AsyncAPI migrations as AI-callable tools over a Streamable-HTTP endpoint served by Express.

## Quick Start

```bash
# Build and start locally
npm install
npm run build
npm start

# Or run in development mode with hot-reload
npm run dev
```

Run these commands from the repository root with the corresponding npm workspace commands when necessary, for example `npm run build --workspace @tklein1801/esg-mcp`.

The CLI `run` command supports two transports. HTTP is the default:

```bash
npx esg-mcp run --type http --port 3070
SOLACE_CLOUD_TOKEN=<your-token> npx esg-mcp run --type stdio
```

The stdio transport uses only `SOLACE_CLOUD_TOKEN` for authentication. HTTP keeps the request-header authentication flow.

## Environment Variables

| Variable             | Required | Description                                           | Default       |
| :------------------- | :------: | :---------------------------------------------------- | :------------ |
| `PORT`               |    –     | HTTP port the service listens on                      | `3070`        |
| `NODE_ENV`           |    –     | Runtime environment (`production` enables rate-limit) | `development` |
| `LOG_LEVEL`          |    –     | Winston log level (`error`, `warn`, `info`, `debug`)  | `info`        |
| `SOLACE_CLOUD_TOKEN` |    –     | Fallback token for authenticating MCP requests        | –             |
| `ALLOW_CREATE`       |    –     | Enable create tools (`true`/`false`)                  | `false`       |
| `ALLOW_UPDATE`       |    –     | Enable update tools (`true`/`false`)                  | `false`       |
| `ALLOW_DELETE`       |    –     | Enable delete tools (`true`/`false`)                  | `false`       |

### Tool Toggles

Create, update, and delete tools are **disabled by default**. Set the respective environment variable to `true` to enable them:

```bash
ALLOW_CREATE=true ALLOW_UPDATE=true ALLOW_DELETE=true npm start
```

## Authentication

Authentication for `/mcp` can be configured with a token per request or, as a fallback, when starting the MCP server:

- `Authorization` header with a Bearer access token
- `X-Api-Key` header with an API key
- `SOLACE_CLOUD_TOKEN` environment variable

Request headers take precedence over `SOLACE_CLOUD_TOKEN`. If both request headers are present, `X-Api-Key` takes precedence over `Authorization`. Requests without valid authentication receive a `401 Unauthorized` response.

For example, start the server with a default token:

```bash
SOLACE_CLOUD_TOKEN=<your-token> npm start --workspace @tklein1801/esg-mcp
```

## Health Endpoint

```
GET /status # or /api/status
GET /health # or /api/health
```

Returns `{ "status": "ok" }` with HTTP 200.

## MCP Endpoint

The service exposes a single MCP-over-HTTP endpoint:

```
POST   /mcp  – JSON-RPC request
GET    /mcp  – SSE stream for server-initiated messages
DELETE /mcp  – close session
```

The endpoint is **stateless** — each request creates a fresh MCP server and transport instance scoped to the authenticated context.

### Claude Code Configuration

Claude Code can configure both transports in `.mcp.json` at the project root. The HTTP server must be started separately:

```bash
SOLACE_CLOUD_TOKEN=<your-token> npx esg-mcp run --type http --port 3070
```

```json
{
  "mcpServers": {
    "esg-http": {
      "type": "http",
      "url": "http://localhost:3070/mcp",
      "headers": {
        "Authorization": "Bearer ${SOLACE_CLOUD_TOKEN}"
      }
    },
    "esg-stdio": {
      "type": "stdio",
      "command": "npx",
      "args": ["esg-mcp", "run", "--type", "stdio"],
      "env": {
        "SOLACE_CLOUD_TOKEN": "<your-token>"
      }
    }
  }
}
```

For the HTTP entry, Claude Code sends the token as an `Authorization` header. For the Stdio entry, Claude Code starts the MCP service and passes `SOLACE_CLOUD_TOKEN` as an environment variable. The Stdio transport accepts no request headers and requires this environment variable.

### Claude Desktop Configuration

```json
{
  "mcpServers": {
    "esg": {
      "url": "http://localhost:3070/mcp",
      "headers": {
        "x-api-key": "<your-api-key>"
      }
    }
  }
}
```

## Rate Limiting

Rate limiting is **only active in production** (`NODE_ENV=production`). By default it allows 120 requests per minute per IP address on the `/mcp` endpoint.

## Available Tools

All tools are grouped by domain. Read-only tools (`get_*`, list operations) are always available. Mutation tools (`create_*`, `update_*`, `delete_*`) must be explicitly enabled via environment variables.

### Migration

| Tool               | Availability | Description                                                  |
| :----------------- | :----------- | :----------------------------------------------------------- |
| `migrate_asyncapi` | Always       | Convert an AsyncAPI between structured and unstructured mode |

`migrate_asyncapi` uses the same migration core as the webapp and CLI. It accepts an AsyncAPI specification as a YAML or JSON string and supports both migration directions:

- `to-structured`: AsyncAPI 2.x / unstructured CloudEvents → AsyncAPI 3.x / structured CloudEvents
- `to-unstructured`: AsyncAPI 3.x / structured CloudEvents → AsyncAPI 2.x / unstructured CloudEvents

Input parameters:

| Parameter | Required | Description                                                   |
| :-------- | :------: | :------------------------------------------------------------ |
| `content` |   Yes    | AsyncAPI specification as YAML or JSON                        |
| `action`  |   Yes    | `to-structured` or `to-unstructured`                          |
| `format`  |    No    | Output format: `yaml` or `json`; defaults to the input format |

The result contains the migrated specification in `content`, its `format`, the selected `action`, and the resulting AsyncAPI version. Invalid syntax, unsupported versions, and migration validation errors are returned as MCP tool errors.

Example tool arguments:

```json
{
  "content": "asyncapi: 2.6.0\ninfo:\n  title: Orders\n  version: 1.0.0\n",
  "action": "to-structured",
  "format": "yaml"
}
```

The migration runs locally in the MCP service; no CLI process is started and no external service is required.

### Applications

| Tool                         | Availability   | Description                                 |
| :--------------------------- | :------------- | :------------------------------------------ |
| `get_application`            | Always         | Get a specific application by its ID        |
| `get_applications`           | Always         | List all applications with optional filters |
| `get_application_version`    | Always         | Get a specific application version by ID    |
| `get_applications_versions`  | Always         | List application versions with filters      |
| `create_application`         | `ALLOW_CREATE` | Create a new application                    |
| `create_application_version` | `ALLOW_CREATE` | Create a new version of an application      |
| `update_application`         | `ALLOW_UPDATE` | Update an existing application              |
| `update_application_version` | `ALLOW_UPDATE` | Update an existing application version      |
| `delete_application`         | `ALLOW_DELETE` | Delete an application by its ID             |
| `delete_application_version` | `ALLOW_DELETE` | Delete an application version by its ID     |

### Application Domains

| Tool                        | Availability   | Description                                 |
| :-------------------------- | :------------- | :------------------------------------------ |
| `get_application_domain`    | Always         | Get a specific application domain by its ID |
| `get_application_domains`   | Always         | List all application domains with filters   |
| `create_application_domain` | `ALLOW_CREATE` | Create a new application domain             |
| `update_application_domain` | `ALLOW_UPDATE` | Update an existing application domain       |
| `delete_application_domain` | `ALLOW_DELETE` | Delete an application domain by ID          |

### Events

| Tool                   | Availability   | Description                            |
| :--------------------- | :------------- | :------------------------------------- |
| `get_event`            | Always         | Get a specific event by its ID         |
| `get_events`           | Always         | List all events with optional filters  |
| `get_event_version`    | Always         | Get a specific event version by its ID |
| `get_event_versions`   | Always         | List event versions with filters       |
| `create_event`         | `ALLOW_CREATE` | Create a new event                     |
| `create_event_version` | `ALLOW_CREATE` | Create a new version of an event       |
| `update_event`         | `ALLOW_UPDATE` | Update an existing event               |
| `update_event_version` | `ALLOW_UPDATE` | Update an existing event version       |
| `delete_event`         | `ALLOW_DELETE` | Delete an event by its ID              |
| `delete_event_version` | `ALLOW_DELETE` | Delete an event version by its ID      |

### Schemas

| Tool                    | Availability   | Description                             |
| :---------------------- | :------------- | :-------------------------------------- |
| `get_schema`            | Always         | Get a specific schema by its ID         |
| `get_schemas`           | Always         | List schemas with optional filters      |
| `get_schema_version`    | Always         | Get a specific schema version by its ID |
| `get_schema_versions`   | Always         | List versions with filters              |
| `create_schema`         | `ALLOW_CREATE` | Create a new schema                     |
| `create_schema_version` | `ALLOW_CREATE` | Create a new version of a schema        |
| `update_schema`         | `ALLOW_UPDATE` | Update an existing schema               |
| `update_schema_version` | `ALLOW_UPDATE` | Update an existing schema version       |
| `delete_schema`         | `ALLOW_DELETE` | Delete a schema by its ID               |
| `delete_schema_version` | `ALLOW_DELETE` | Delete a schema version by its ID       |

## Development

```bash
npm run dev         # start with hot-reload (tsx watch)
npm run build       # compile TypeScript
npm start           # run compiled build
npm test            # run unit tests (preceded by lint & format check)
npm run check       # lint + format check
npm run check:write # auto-fix lint + format
```
