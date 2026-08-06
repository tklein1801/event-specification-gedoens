import { ApplicationsService } from '@solace-labs/ep-openapi-node';
import { config } from '../config';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { err, ok } from './helpers';
import { z } from 'zod';
import { ZApplicationDomainId } from '../schemas/ApplicationDomain.schema';
import { ZPageNumber, ZPageSize } from '../schemas/Shared.schema';
import {
  ZApplicationBrokerType,
  ZApplicationDescription,
  ZApplicationDisplayName,
  ZApplicationId,
  ZApplicationName,
  ZApplicationType,
  ZApplicationVersion,
} from '../schemas/Application.schema';

export function registerApplicationTools(server: McpServer): void {
  if (config.tools.allow_create) {
    server.registerTool(
      'create_application',
      {
        description: 'Create a new application',
        inputSchema: {
          applicationDomainId: ZApplicationDomainId,
          applicationType: ZApplicationType,
          name: ZApplicationName,
          brokerType: ZApplicationBrokerType,
        },
      },
      async ({ applicationDomainId, name, applicationType, brokerType }) => {
        try {
          const result = await ApplicationsService.createApplication({
            requestBody: {
              applicationDomainId,
              applicationType,
              name,
              brokerType,
            },
          });
          return ok(result);
        } catch (error) {
          return err(error);
        }
      },
    );

    server.registerTool(
      'create_application_version',
      {
        description: 'Create a new version of an application',
        inputSchema: {
          applicationId: ZApplicationId,
          version: ZApplicationVersion,
          description: ZApplicationDescription.optional(),
          displayName: ZApplicationDisplayName.optional(),
        },
      },
      async ({ applicationId, version, description, displayName }) => {
        try {
          const result = await ApplicationsService.createApplicationVersion({
            requestBody: {
              applicationId,
              version,
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
      'update_application',
      {
        description: 'Update an existing application',
        inputSchema: {
          applicationId: ZApplicationId,
          applicationDomainId: ZApplicationDomainId,
          name: ZApplicationName,
          applicationType: ZApplicationType,
          brokerType: ZApplicationBrokerType,
        },
      },
      async ({ applicationId, applicationDomainId, name, applicationType, brokerType }) => {
        try {
          const result = await ApplicationsService.updateApplication({
            id: applicationId,
            requestBody: {
              applicationDomainId,
              applicationType,
              brokerType,
              name,
            },
          });
          return ok(result);
        } catch (error) {
          return err(error);
        }
      },
    );

    server.registerTool(
      'update_application_version',
      {
        description: 'Update an existing application version',
        inputSchema: {
          versionId: ZApplicationVersion,
          applicationId: ZApplicationId,
          version: ZApplicationVersion,
          description: ZApplicationDescription.optional(),
          displayName: ZApplicationDisplayName.optional(),
        },
      },
      async ({ versionId, applicationId, version, description, displayName }) => {
        try {
          const result = await ApplicationsService.updateApplicationVersion({
            versionId: versionId,
            requestBody: {
              applicationId,
              version,
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
      'delete_application',
      {
        description: 'Delete an application by its ID',
        inputSchema: {
          applicationId: ZApplicationId,
        },
      },
      async ({ applicationId }) => {
        try {
          const result = await ApplicationsService.deleteApplication({
            id: applicationId,
          });
          return ok(result);
        } catch (error) {
          return err(error);
        }
      },
    );

    server.registerTool(
      'delete_application_version',
      {
        description: 'Delete an application version by its ID',
        inputSchema: {
          versionId: ZApplicationVersion,
        },
      },
      async ({ versionId }) => {
        try {
          const result = await ApplicationsService.deleteApplicationVersion({
            versionId: versionId,
          });
          return ok(result);
        } catch (error) {
          return err(error);
        }
      },
    );
  }

  server.registerTool(
    'get_application',
    {
      description: 'Get a specific application by its ID',
      inputSchema: {
        applicationId: ZApplicationId,
      },
    },
    async ({ applicationId }) => {
      try {
        const result = await ApplicationsService.getApplication({
          id: applicationId,
        });
        return ok(result);
      } catch (error) {
        return err(error);
      }
    },
  );

  server.registerTool(
    'get_applications',
    {
      description: 'Get all applications',
      inputSchema: {
        applicationDomainId: ZApplicationDomainId.optional(),
        applicationType: ZApplicationType.optional(),
        name: ZApplicationName.optional(),
        pageNumber: ZPageNumber.optional(),
        pageSize: ZPageSize.optional(),
      },
    },
    async ({ applicationDomainId, applicationType, name, pageNumber, pageSize }) => {
      try {
        const result = await ApplicationsService.getApplications({
          applicationDomainId,
          applicationType,
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
    'get_application_version',
    {
      description: 'Get a specific application version by its ID',
      inputSchema: {
        versionId: ZApplicationVersion,
      },
    },
    async ({ versionId }) => {
      try {
        const result = await ApplicationsService.getApplicationVersion({
          versionId: versionId,
        });
        return ok(result);
      } catch (error) {
        return err(error);
      }
    },
  );

  server.registerTool(
    'get_applications_versions',
    {
      description: 'List application versions with optional filters',
      inputSchema: {
        versionIds: z.array(ZApplicationVersion).optional(),
        applicationIds: z.array(ZApplicationId).optional(),
        pageNumber: ZPageNumber.optional(),
        pageSize: ZPageSize.optional(),
      },
    },
    async ({ versionIds, applicationIds, pageNumber, pageSize }) => {
      try {
        const result = await ApplicationsService.getApplicationVersions({
          ids: versionIds,
          applicationIds: applicationIds,
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
