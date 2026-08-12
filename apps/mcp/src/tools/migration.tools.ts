import {
  migrateAsyncApiText,
  type MigrationAction,
  type SpecificationFormat,
} from '@event-specification-gedoens/migration-core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { err, ok } from './helpers';
import { z } from 'zod';

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

  server.registerTool(
    'migrate_asyncapi',
    {
      description:
        'Migrate an AsyncAPI specification between structured and unstructured CloudEvents.',
      inputSchema: {
        content: z.string().min(1).describe('The AsyncAPI specification as YAML or JSON.'),
        action: z.enum(['to-structured', 'to-unstructured']).describe('The migration direction.'),
        format: z
          .enum(['yaml', 'json'])
          .optional()
          .describe('The output format. Defaults to the input format.'),
      },
    },
    async ({ content, action, format }) => {
      try {
        const result = migrateAsyncApiText(
          content,
          action as MigrationAction,
          format as SpecificationFormat | undefined,
        );

        return ok({
          content: result.content,
          format: result.format,
          action,
          asyncapi: result.document.asyncapi,
        });
      } catch (error) {
        return err(error);
      }
    },
  );
}
