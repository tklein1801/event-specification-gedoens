import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerApplicationTools } from './application.tools';
import { registerApplicationDomainTools } from './domain.tools';
import { registerEventTools } from './event.tools';
import { registerSchemaTools } from './schema.tools';
import { registerMigrationTools } from './migration.tools';
import { registerSearchTools } from './search.tools';

export function registerAllTools(server: McpServer): void {
  registerSearchTools(server);
  registerApplicationTools(server);
  registerApplicationDomainTools(server);
  registerEventTools(server);
  registerSchemaTools(server);
  registerMigrationTools(server);
}

export { ok, err } from './helpers';
