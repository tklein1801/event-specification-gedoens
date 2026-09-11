import { EnumsService, type TopicAddressEnumVersion } from '@solace-labs/ep-openapi-node';
import { config } from '../appConfig';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { err, ok } from './helpers';
import { z } from 'zod';
import { ZApplicationDomainId } from '../schemas/ApplicationDomain.schema';
import {
  ZEnumDescription,
  ZEnumDisplayName,
  ZEnumId,
  ZEnumName,
  ZEnumValues,
  ZEnumVersion,
  ZEnumVersionId,
} from '../schemas/Enum.schema';
import { ZPageNumber, ZPageSize } from '../schemas/Shared.schema';
import { ZShared } from '../schemas/Schema.schema';

export function registerEnumTools(server: McpServer): void {
  if (config.tools.allow_create) {
    server.registerTool(
      'create_enum',
      {
        description: 'Create a new enumeration',
        inputSchema: {
          applicationDomainId: ZApplicationDomainId,
          name: ZEnumName,
          shared: ZShared.optional().default(false),
        },
      },
      async ({ applicationDomainId, name, shared }) => {
        try {
          const result = await EnumsService.createEnum({
            requestBody: {
              applicationDomainId,
              name,
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
      'create_enum_version',
      {
        description: 'Create a new version of an enumeration',
        inputSchema: {
          enumId: ZEnumId,
          version: ZEnumVersion,
          displayName: ZEnumDisplayName.optional(),
          description: ZEnumDescription.optional(),
          values: ZEnumValues,
        },
      },
      async ({ enumId, version, displayName, description, values }) => {
        try {
          const result = await EnumsService.createEnumVersion({
            requestBody: {
              enumId,
              version,
              displayName,
              description,
              values,
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
      'update_enum',
      {
        description: 'Update an existing enumeration',
        inputSchema: {
          enumId: ZEnumId,
          applicationDomainId: ZApplicationDomainId,
          name: ZEnumName,
          shared: ZShared.optional(),
        },
      },
      async ({ enumId, applicationDomainId, name, shared }) => {
        try {
          const result = await EnumsService.updateEnum({
            id: enumId,
            requestBody: {
              applicationDomainId,
              name,
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
      'update_enum_version',
      {
        description: 'Update an existing enumeration version',
        inputSchema: {
          enumVersionId: ZEnumVersionId,
          enumId: ZEnumId,
          version: ZEnumVersion,
          displayName: ZEnumDisplayName.optional(),
          description: ZEnumDescription.optional(),
          values: ZEnumValues.optional(),
        },
      },
      async ({ enumVersionId, enumId, version, displayName, description, values }) => {
        try {
          const result = await EnumsService.updateEnumVersion({
            id: enumVersionId,
            requestBody: {
              enumId,
              version,
              displayName,
              description,
              values,
            } as TopicAddressEnumVersion,
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
      'delete_enum',
      {
        description: 'Delete an enumeration by its ID',
        inputSchema: {
          enumId: ZEnumId,
        },
      },
      async ({ enumId }) => {
        try {
          const result = await EnumsService.deleteEnum({
            id: enumId,
          });
          return ok(result);
        } catch (error) {
          return err(error);
        }
      },
    );

    server.registerTool(
      'delete_enum_version',
      {
        description: 'Delete an enumeration version by its ID',
        inputSchema: {
          enumVersionId: ZEnumVersionId,
        },
      },
      async ({ enumVersionId }) => {
        try {
          const result = await EnumsService.deleteEnumVersion({
            id: enumVersionId,
          });
          return ok(result);
        } catch (error) {
          return err(error);
        }
      },
    );
  }

  server.registerTool(
    'get_enum',
    {
      description: 'Get a specific enumeration by its ID',
      inputSchema: {
        enumId: ZEnumId,
      },
    },
    async ({ enumId }) => {
      try {
        const result = await EnumsService.getEnum({
          id: enumId,
        });
        return ok(result);
      } catch (error) {
        return err(error);
      }
    },
  );

  server.registerTool(
    'get_enums',
    {
      description: 'List enumerations with optional filters',
      inputSchema: {
        ids: z.array(ZEnumId).optional(),
        applicationDomainId: ZApplicationDomainId.optional(),
        applicationDomainIds: z.array(ZApplicationDomainId).optional(),
        names: z.array(ZEnumName).optional(),
        shared: ZShared.optional(),
        pageNumber: ZPageNumber.optional(),
        pageSize: ZPageSize.optional(),
      },
    },
    async ({
      ids,
      applicationDomainId,
      applicationDomainIds,
      names,
      shared,
      pageNumber,
      pageSize,
    }) => {
      try {
        const result = await EnumsService.getEnums({
          ids,
          applicationDomainId,
          applicationDomainIds,
          names,
          shared,
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
    'get_enum_version',
    {
      description: 'Get a specific enumeration version by its ID',
      inputSchema: {
        enumVersionId: ZEnumVersionId,
      },
    },
    async ({ enumVersionId }) => {
      try {
        const result = await EnumsService.getEnumVersion({
          versionId: enumVersionId,
        });
        return ok(result);
      } catch (error) {
        return err(error);
      }
    },
  );

  server.registerTool(
    'get_enum_versions',
    {
      description: 'List enumeration versions with optional filters',
      inputSchema: {
        enumIds: z.array(ZEnumId).optional(),
        enumVersionIds: z.array(ZEnumVersionId).optional(),
        pageNumber: ZPageNumber.optional(),
        pageSize: ZPageSize.optional(),
      },
    },
    async ({ enumIds, enumVersionIds, pageNumber, pageSize }) => {
      try {
        const result = await EnumsService.getEnumVersions({
          enumIds,
          ids: enumVersionIds,
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
