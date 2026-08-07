import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { err, ok } from './helpers';
import z from 'zod';

export function registerMigrationTools(server: McpServer): void {
  server.registerTool(
    'stringify_json_schema',
    {
      description: 'Stringify a JSON schema',
      inputSchema: {
        content: z.record(z.string(), z.unknown()).describe('The JSON schema to stringify.'),
      },
    },
    async ({ content }) => {
      try {
        const stringifiedContent = JSON.stringify(content, null, 2);

        return ok({ content: stringifiedContent });
      } catch (error) {
        return err(error);
      }
    },
  );
}
