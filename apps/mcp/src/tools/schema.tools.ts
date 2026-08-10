import { SchemasService } from '@solace-labs/ep-openapi-node';
import { config } from '../appConfig';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { err, ok } from './helpers';
import { z } from 'zod';
import { ZApplicationDomainId } from '../schemas/ApplicationDomain.schema';
import {
  ZSchemaContent,
  ZSchemaDescription,
  ZSchemaDisplayName,
  ZSchemaId,
  ZSchemaName,
  ZSchemaType,
  ZSchemaVersion,
  ZSchemaVersionId,
  ZShared,
} from '../schemas/Schema.schema';
import { ZPageNumber, ZPageSize } from '../schemas/Shared.schema';

export function registerSchemaTools(server: McpServer): void {
  if (config.tools.allow_create) {
    server.registerTool(
      'create_schema',
      {
        description: 'Create a new schema',
        inputSchema: {
          applicationDomainId: ZApplicationDomainId,
          name: ZSchemaName,
          schemaType: ZSchemaType,
          shared: ZShared.optional().default(false),
        },
      },
      async ({ applicationDomainId, name, schemaType, shared }) => {
        try {
          const result = await SchemasService.createSchema({
            requestBody: {
              applicationDomainId,
              name,
              schemaType,
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
      'create_schema_version',
      {
        description: 'Create a new version of a schema',
        inputSchema: {
          schemaId: ZSchemaId,
          version: ZSchemaVersion,
          displayName: ZSchemaDisplayName.optional(),
          description: ZSchemaDescription.optional(),
          content: ZSchemaContent.optional(),
        },
      },
      async ({ schemaId, version, content, description, displayName }) => {
        try {
          const result = await SchemasService.createSchemaVersion({
            requestBody: {
              schemaId,
              version,
              content,
              description,
              displayName,
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
      'update_schema',
      {
        description: 'Update an existing schema',
        inputSchema: {
          schemaId: ZSchemaId,
          applicationDomainId: ZApplicationDomainId,
          name: ZSchemaName,
          schemaType: ZSchemaType,
          shared: ZShared.optional(),
        },
      },
      async ({ schemaId, applicationDomainId, name, schemaType, shared }) => {
        try {
          const result = await SchemasService.updateSchema({
            id: schemaId,
            requestBody: {
              applicationDomainId,
              name,
              schemaType,
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
      'update_schema_version',
      {
        description: 'Update an existing schema version',
        inputSchema: {
          schemaId: ZSchemaId,
          schemaVersionId: ZSchemaVersionId,
          displayName: ZSchemaDisplayName.optional(),
          description: ZSchemaDescription.optional(),
          content: ZSchemaContent.optional(),
        },
      },
      async ({ schemaId, schemaVersionId, content, description, displayName }) => {
        try {
          const result = await SchemasService.updateSchemaVersion({
            id: schemaId,
            requestBody: {
              schemaId,
              version: schemaVersionId,
              content,
              description,
              displayName,
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
      'delete_schema',
      {
        description: 'Delete a schema by its ID',
        inputSchema: {
          schemaId: ZSchemaId,
        },
      },
      async ({ schemaId }) => {
        try {
          const result = await SchemasService.deleteSchema({
            id: schemaId,
          });
          return ok(result);
        } catch (error) {
          return err(error);
        }
      },
    );

    server.registerTool(
      'delete_schema_version',
      {
        description: 'Delete a schema version by its ID',
        inputSchema: {
          schemaVersionId: ZSchemaVersionId,
        },
      },
      async ({ schemaVersionId }) => {
        try {
          const result = await SchemasService.deleteSchemaVersion({
            id: schemaVersionId,
          });
          return ok(result);
        } catch (error) {
          return err(error);
        }
      },
    );
  }

  server.registerTool(
    'get_schema',
    {
      description: 'Get a specific schema by its ID',
      inputSchema: {
        schemaId: ZSchemaId,
      },
    },
    async ({ schemaId }) => {
      try {
        const result = await SchemasService.getSchema({
          id: schemaId,
        });
        return ok(result);
      } catch (error) {
        return err(error);
      }
    },
  );

  server.registerTool(
    'get_schemas',
    {
      description: 'List schemas with optional filters',
      inputSchema: {
        applicationDomainId: ZApplicationDomainId.optional(),
        applicationDomainIds: z.array(ZApplicationDomainId).optional(),
        name: ZSchemaName.optional(),
        schemaType: ZSchemaType.optional(),
        shared: ZShared.optional(),
        pageNumber: ZPageNumber.optional(),
        pageSize: ZPageSize.optional(),
      },
    },
    async ({
      applicationDomainId,
      applicationDomainIds,
      name,
      schemaType,
      shared,
      pageNumber,
      pageSize,
    }) => {
      try {
        const result = await SchemasService.getSchemas({
          applicationDomainId,
          applicationDomainIds,
          name,
          shared,
          schemaType,
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
    'get_schema_version',
    {
      description: 'Get a specific schema version by its ID',
      inputSchema: {
        schemaVersionId: ZSchemaVersionId,
      },
    },
    async ({ schemaVersionId }) => {
      try {
        const result = await SchemasService.getSchemaVersion({
          versionId: schemaVersionId,
        });
        return ok(result);
      } catch (error) {
        return err(error);
      }
    },
  );

  server.registerTool(
    'get_schema_versions',
    {
      description: 'List schema versions with optional filters',
      inputSchema: {
        schemaIds: z.array(ZSchemaId).optional(),
        schemaVersionIds: z.array(ZSchemaVersionId).optional(),
        pageNumber: ZPageNumber.optional(),
        pageSize: ZPageSize.optional(),
      },
    },
    async ({ schemaIds, schemaVersionIds, pageNumber, pageSize }) => {
      try {
        const result = await SchemasService.getSchemaVersions({
          ids: schemaVersionIds,
          schemaIds,
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
