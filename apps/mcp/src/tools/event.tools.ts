import { EventsService } from '@solace-labs/ep-openapi-node';
import { config } from '../config';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { err, ok } from './helpers';
import { z } from 'zod';
import { ZApplicationDomainId } from '../schemas/ApplicationDomain.schema';
import { ZPageNumber, ZPageSize } from '../schemas/Shared.schema';
import { ZApplicationName, ZApplicationType } from '../schemas/Application.schema';
import {
  ZEventName,
  ZEventBrokerType,
  ZIsEventShared,
  ZEventId,
  ZEventVersion,
  ZEventDescription,
  ZEventDisplayName,
} from '../schemas/Event.schema';
import { ZSchemaVersion } from '../schemas/Schema.schema';

export function registerEventTools(server: McpServer): void {
  if (config.tools.allow_create) {
    server.registerTool(
      'create_event',
      {
        description: 'Create a new event',
        inputSchema: {
          applicationDomainId: ZApplicationDomainId,
          name: ZEventName,
          brokerType: ZEventBrokerType,
          shared: ZIsEventShared,
        },
      },
      async ({ applicationDomainId, name, brokerType, shared }) => {
        try {
          const result = await EventsService.createEvent({
            requestBody: {
              applicationDomainId,
              name,
              brokerType,
              shared,
            },
          });
          return ok(result);
        } catch (error) {
          return err(error);
        }
      },
    );

    server.registerTool(
      'create_event_version',
      {
        description: 'Create a new version of an event',
        inputSchema: {
          eventId: ZEventId,
          version: ZEventVersion,
          description: ZEventDescription.optional(),
          displayName: ZEventDisplayName.optional(),
          schemaVersionId: ZSchemaVersion.optional(),
        },
      },
      async ({ description, displayName, eventId, schemaVersionId, version }) => {
        try {
          const result = await EventsService.createEventVersion({
            requestBody: {
              eventId,
              version,
              description,
              displayName,
              schemaVersionId,
            },
          });
          return ok(result);
        } catch (error) {
          return err(error);
        }
      },
    );
  }

  if (config.tools.allow_update) {
    server.registerTool(
      'update_event',
      {
        description: 'Update an existing event',
        inputSchema: {
          eventId: ZEventId,
          applicationDomainId: ZApplicationDomainId,
          name: ZEventName,
          brokerType: ZEventBrokerType,
          shared: ZIsEventShared,
        },
      },
      async ({ applicationDomainId, name, brokerType, shared, eventId }) => {
        try {
          const result = await EventsService.updateEvent({
            id: eventId,
            requestBody: {
              applicationDomainId,
              name,
              brokerType,
              shared,
            },
          });
          return ok(result);
        } catch (error) {
          return err(error);
        }
      },
    );

    server.registerTool(
      'update_event_version',
      {
        description: 'Update an existing event version',
        inputSchema: {
          eventId: ZEventId,
          version: ZEventVersion,
          description: ZEventDescription.optional(),
          displayName: ZEventDisplayName.optional(),
          schemaVersionId: ZSchemaVersion.optional(),
        },
      },
      async ({ eventId, version, description, displayName, schemaVersionId }) => {
        try {
          const result = await EventsService.updateEventVersion({
            id: eventId,
            requestBody: {
              eventId,
              version,
              displayName,
              description,
              schemaVersionId,
            },
          });
          return ok(result);
        } catch (error) {
          return err(error);
        }
      },
    );
  }

  if (config.tools.allow_delete) {
    server.registerTool(
      'delete_event',
      {
        description: 'Delete an event by its ID',
        inputSchema: {
          eventId: ZEventId,
        },
      },
      async ({ eventId }) => {
        try {
          const result = await EventsService.deleteEvent({
            id: eventId,
          });
          return ok(result);
        } catch (error) {
          return err(error);
        }
      },
    );

    server.registerTool(
      'delete_event_version',
      {
        description: 'Delete an event version by its ID',
        inputSchema: {
          versionId: ZEventVersion,
        },
      },
      async ({ versionId }) => {
        try {
          const result = await EventsService.deleteEventVersion({
            id: versionId,
          });
          return ok(result);
        } catch (error) {
          return err(error);
        }
      },
    );
  }

  server.registerTool(
    'get_event',
    {
      description: 'Get a specific event by its ID',
      inputSchema: {
        eventId: ZEventId,
      },
    },
    async ({ eventId }) => {
      try {
        const result = await EventsService.getEvent({
          id: eventId,
        });
        return ok(result);
      } catch (error) {
        return err(error);
      }
    },
  );

  server.registerTool(
    'get_events',
    {
      description: 'List events with optional filters',
      inputSchema: {
        applicationDomainId: ZApplicationDomainId.optional(),
        applicationDomainIds: z.array(ZApplicationDomainId).optional(),
        shared: ZIsEventShared.optional(),
        brokerType: ZEventBrokerType.optional(),
        applicationType: ZApplicationType.optional(),
        name: ZApplicationName.optional(),
        pageNumber: ZPageNumber.optional(),
        pageSize: ZPageSize.optional(),
      },
    },
    async ({
      applicationDomainId,
      applicationDomainIds,
      shared,
      brokerType,
      name,
      pageNumber,
      pageSize,
    }) => {
      try {
        const result = await EventsService.getEvents({
          applicationDomainId,
          applicationDomainIds,
          shared,
          brokerType,
          name,
          pageNumber,
          pageSize,
        });
        return ok(result);
      } catch (error) {
        return err(error);
      }
    },
  );

  server.registerTool(
    'get_event_version',
    {
      description: 'Get a specific event version by its ID',
      inputSchema: {
        versionId: ZEventVersion,
      },
    },
    async ({ versionId }) => {
      try {
        const result = await EventsService.getEventVersion({
          id: versionId,
        });
        return ok(result);
      } catch (error) {
        return err(error);
      }
    },
  );

  server.registerTool(
    'get_event_versions',
    {
      description: 'List event versions with optional filters',
      inputSchema: {
        versionIds: z.array(ZEventVersion).optional(),
        applicationIds: z.array(ZEventId).optional(),
        pageNumber: ZPageNumber.optional(),
        pageSize: ZPageSize.optional(),
      },
    },
    async ({ versionIds, applicationIds, pageNumber, pageSize }) => {
      try {
        const result = await EventsService.getEventVersions({
          ids: versionIds,
          eventIds: applicationIds,
          pageNumber,
          pageSize,
        });
        return ok(result);
      } catch (error) {
        return err(error);
      }
    },
  );
}
