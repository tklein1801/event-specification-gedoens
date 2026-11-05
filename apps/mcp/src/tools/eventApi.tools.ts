import { EventApIsService } from '@solace-labs/ep-openapi-node';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ZPageNumber, ZPageSize } from '../schemas/Shared.schema';
import { err, ok } from './helpers';
import { z } from 'zod';

const ZEventApiId = z.string().min(1).describe('The ID of the event API.');
const ZEventApiVersionId = z.string().min(1).describe('The ID of the event API version.');

export function registerEventApiTools(server: McpServer): void {
  server.registerTool(
    'get_event_apis',
    {
      description: 'List event APIs with optional application domain and name filters.',
      inputSchema: {
        applicationDomainId: z.string().optional(),
        name: z.string().optional(),
        shared: z.boolean().optional(),
        pageNumber: ZPageNumber.optional(),
        pageSize: ZPageSize.optional(),
      },
    },
    async ({ applicationDomainId, name, shared, pageNumber, pageSize }) => {
      try {
        return ok(
          await EventApIsService.getEventApis({
            applicationDomainId,
            name,
            shared,
            pageNumber,
            pageSize,
          }),
        );
      } catch (error) {
        return err(error);
      }
    },
  );

  server.registerTool(
    'get_event_api',
    {
      description: 'Get a specific event API by its ID.',
      inputSchema: { eventApiId: ZEventApiId },
    },
    async ({ eventApiId }) => {
      try {
        return ok(await EventApIsService.getEventApi({ id: eventApiId }));
      } catch (error) {
        return err(error);
      }
    },
  );

  server.registerTool(
    'get_event_api_versions',
    {
      description: 'List versions for one or more event APIs.',
      inputSchema: {
        eventApiIds: z.array(ZEventApiId).optional(),
        pageNumber: ZPageNumber.optional(),
        pageSize: ZPageSize.optional(),
      },
    },
    async ({ eventApiIds, pageNumber, pageSize }) => {
      try {
        return ok(
          await EventApIsService.getEventApiVersions({ eventApiIds, pageNumber, pageSize }),
        );
      } catch (error) {
        return err(error);
      }
    },
  );

  server.registerTool(
    'get_event_api_version',
    {
      description: 'Get a specific event API version by its ID.',
      inputSchema: { eventApiVersionId: ZEventApiVersionId },
    },
    async ({ eventApiVersionId }) => {
      try {
        return ok(await EventApIsService.getEventApiVersion({ versionId: eventApiVersionId }));
      } catch (error) {
        return err(error);
      }
    },
  );
}
