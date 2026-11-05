import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerApplicationTools } from './application.tools';
import { registerApplicationDomainTools } from './domain.tools';
import { registerEventTools } from './event.tools';
import { registerSchemaTools } from './schema.tools';
import { registerEnumTools } from './enum.tools';
import { registerMigrationTools } from './migration.tools';
import { registerSearchTools } from './search.tools';
import { registerAsyncApiExportTools } from './export.tools';
import { registerEventApiTools } from './eventApi.tools';

export function registerAllTools(server: McpServer): void {
  registerSearchTools(server);
  registerEventApiTools(server);
  registerApplicationTools(server);
  registerApplicationDomainTools(server);
  registerEventTools(server);
  registerSchemaTools(server);
  registerEnumTools(server);
  registerMigrationTools(server);
  registerAsyncApiExportTools(server);
}

export { ok, err } from './helpers';
