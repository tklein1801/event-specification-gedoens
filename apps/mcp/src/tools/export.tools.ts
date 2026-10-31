import { ApplicationsService, EventApIsService } from '@solace-labs/ep-openapi-node';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  ZAsyncApiFormat,
  ZAsyncApiVersion,
  ZIncludedExtensions,
} from '../schemas/AsyncApiExport.schema';
import { err, ok } from './helpers';
import { z } from 'zod';

export function registerAsyncApiExportTools(server: McpServer): void {
  server.registerTool(
    'export_application_asyncapi',
    {
      description: 'Export an application version as an AsyncAPI specification.',
      inputSchema: {
        applicationVersionId: zId('The ID of the application version to export.'),
        format: ZAsyncApiFormat,
        asyncApiVersion: ZAsyncApiVersion,
        includedExtensions: ZIncludedExtensions,
      },
    },
    async ({
      applicationVersionId,
      format = 'yaml',
      asyncApiVersion = '2.5.0',
      includedExtensions = 'all',
    }) => {
      try {
        const content = await ApplicationsService.getAsyncApiForApplicationVersion({
          applicationVersionId,
          format,
          asyncApiVersion,
          includedExtensions,
        });
        return ok({
          source: 'application',
          versionId: applicationVersionId,
          format,
          asyncapi: asyncApiVersion,
          content: normalizeContent(content, format),
        });
      } catch (error) {
        return err(error);
      }
    },
  );

  server.registerTool(
    'export_event_api_asyncapi',
    {
      description: 'Export an event API version as an AsyncAPI specification.',
      inputSchema: {
        eventApiVersionId: zId('The ID of the event API version to export.'),
        format: ZAsyncApiFormat,
        asyncApiVersion: ZAsyncApiVersion,
        includedExtensions: ZIncludedExtensions,
      },
    },
    async ({
      eventApiVersionId,
      format = 'yaml',
      asyncApiVersion = '2.5.0',
      includedExtensions = 'all',
    }) => {
      try {
        const content = await EventApIsService.getAsyncApiForEventApiVersion({
          eventApiVersionId,
          format,
          asyncApiVersion,
          includedExtensions,
        });
        return ok({
          source: 'event_api',
          versionId: eventApiVersionId,
          format,
          asyncapi: asyncApiVersion,
          content: normalizeContent(content, format),
        });
      } catch (error) {
        return err(error);
      }
    },
  );
}

function zId(description: string) {
  return z.string().min(1).describe(description);
}

function normalizeContent(content: unknown, format: 'yaml' | 'json'): string {
  if (typeof content === 'string') {
    if (content.trim().length === 0) throw new Error('The export service returned empty content.');
    if (format === 'json') {
      try {
        return JSON.stringify(JSON.parse(content), null, 2);
      } catch {
        throw new Error('The export service returned invalid JSON.');
      }
    }
    return content;
  }

  if (content === undefined || content === null) {
    throw new Error('The export service returned no content.');
  }

  if (format === 'json') return JSON.stringify(content, null, 2);
  throw new Error('The export service returned non-text YAML content.');
}
