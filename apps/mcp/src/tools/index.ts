import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { registerApplicationTools } from './application.tools';
import { registerApplicationDomainTools } from './domain.tools';
import { registerEventTools } from './event.tools';
import { registerSchemaTools } from './schema.tools';

export function registerAllTools(server: McpServer): void {
  registerApplicationTools(server);
  registerApplicationDomainTools(server);
  registerEventTools(server);
  registerSchemaTools(server);
}

export { ok, err } from './helpers';
