import { ApplicationsService, ConsumersService } from '@solace-labs/ep-openapi-node';
import { config } from '../appConfig';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { err, ok } from './helpers';
import { z } from 'zod';
import { ZApplicationDomainId } from '../schemas/ApplicationDomain.schema';
import { ZBrokerType, ZPageNumber, ZPageSize } from '../schemas/Shared.schema';
import {
  ZApplicationBrokerType,
  ZApplicationConsumerName,
  ZApplicationConsumerType,
  ZApplicationDescription,
  ZApplicationDisplayName,
  ZApplicationId,
  ZApplicationName,
  ZApplicationType,
  ZApplicationVersion,
  ZApplicationVersionId,
  ZConsumerId,
  ZSubscription,
} from '../schemas/Application.schema';
import { ZEventVersion, ZEventVersionId } from '../schemas/Event.schema';
import { logger } from '../lib/logger';

export function registerApplicationTools(server: McpServer): void {
  if (config.tools.allow_create) {
    server.registerTool(
      'create_application',
      {
        description: 'Create a new application',
        inputSchema: {
          applicationDomainId: ZApplicationDomainId,
          name: ZApplicationName,
          applicationType: ZApplicationType,
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
          displayName: ZApplicationDisplayName.optional(),
          description: ZApplicationDescription.optional(),
          producedEventVersionIds: z.array(ZEventVersion).optional(),
          consumedEventVersionIds: z.array(ZEventVersion).optional(),
          // consumers: z
          //   .array(
          //     z.object({
          //       name: ZApplicationConsumerName,
          //       brokerType: ZBrokerType,
          //       consumerType: ZApplicationConsumerType,
          //       subscriptions: z.array(ZSubscription).optional(),
          //     }),
          //   )
          //   .optional(),
        },
      },
      async ({
        applicationId,
        version,
        description,
        displayName,
        producedEventVersionIds,
        consumedEventVersionIds,
        // consumers
      }) => {
        try {
          const result = await ApplicationsService.createApplicationVersion({
            requestBody: {
              applicationId,
              version,
              description,
              displayName,
              declaredProducedEventVersionIds: producedEventVersionIds,
              declaredConsumedEventVersionIds: consumedEventVersionIds,
              //  consumers: consumers?.map(({brokerType, consumerType, name, subscriptions}) => ({
              //    // TODO: Check back on me
              //    applicationVersionId: version,
              //    name,
              //    brokerType,
              //    consumerType,
              //    subscriptions: [{
              //     //  attractedEventVersionIds: "",
              //      subscriptionType: "",
              //      value: "",
              //    }]
              //  }))
            },
          });
          return ok(result);
        } catch (error) {
          return err(error);
        }
      },
    );

    server.registerTool(
      'create_application_consumer',
      {
        description:
          'Create a consumer for an application version, optionally with event subscriptions',
        inputSchema: {
          applicationVersionId: ZApplicationVersionId,
          name: ZApplicationConsumerName,
          brokerType: ZBrokerType,
          consumerType: ZApplicationConsumerType,
          subscriptions: z.array(ZSubscription).optional(),
        },
      },
      async ({ applicationVersionId, name, brokerType, consumerType, subscriptions }) => {
        try {
          const result = await ConsumersService.createConsumer({
            requestBody: {
              applicationVersionId,
              brokerType,
              consumerType,
              name,
              subscriptions: subscriptions,
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
          applicationVersionId: ZApplicationVersionId,
          applicationId: ZApplicationId,
          version: ZApplicationVersion,
          description: ZApplicationDescription.optional(),
          displayName: ZApplicationDisplayName.optional(),
          producedEventVersionIds: z.array(ZEventVersionId).optional(),
          consumedEventVersionIds: z.array(ZEventVersionId).optional(),
        },
      },
      async ({
        applicationVersionId,
        applicationId,
        version,
        displayName,
        description,
        consumedEventVersionIds,
        producedEventVersionIds,
      }) => {
        try {
          logger.debug('Updating application version', {
            applicationVersionId,
            applicationId,
            version,
            hasDisplayName: displayName !== undefined,
            hasDescription: description !== undefined,
            producedEventVersionCount: producedEventVersionIds?.length ?? 0,
            consumedEventVersionCount: consumedEventVersionIds?.length ?? 0,
          });

          const result = await ApplicationsService.updateApplicationVersion({
            versionId: applicationVersionId,
            requestBody: {
              applicationId,
              version,
              displayName,
              description,
              declaredConsumedEventVersionIds: consumedEventVersionIds,
              declaredProducedEventVersionIds: producedEventVersionIds,
              consumers: [],
            },
          });
          return ok(result);
        } catch (error) {
          return err(error);
        }
      },
    );

    server.registerTool(
      'update_application_consumer',
      {
        description: 'Update an consumer and maintain subscriptions of an application consumer',
        inputSchema: {
          consumerId: ZConsumerId,
          applicationVersionId: ZApplicationVersionId,
          name: ZApplicationConsumerName,
          brokerType: ZBrokerType,
          consumerType: ZApplicationConsumerType,
          subscriptions: z.array(ZSubscription).optional(),
        },
      },
      async ({
        consumerId,
        applicationVersionId,
        name,
        brokerType,
        consumerType,
        subscriptions,
      }) => {
        try {
          const result = await ConsumersService.updateConsumer({
            id: consumerId,
            requestBody: {
              applicationVersionId,
              brokerType,
              consumerType,
              name,
              subscriptions,
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

    server.registerTool(
      'delete_application_consumer',
      {
        description: 'Delete an application consumer by its ID',
        inputSchema: {
          consumerId: ZConsumerId,
        },
      },
      async ({ consumerId }) => {
        try {
          const result = await ConsumersService.deleteConsumer({
            id: consumerId,
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
        applicationVersionId: ZApplicationVersionId,
      },
    },
    async ({ applicationVersionId }) => {
      try {
        const result = await ApplicationsService.getApplicationVersion({
          versionId: applicationVersionId,
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
        applicationVersionIds: z.array(ZApplicationVersion).optional(),
        applicationIds: z.array(ZApplicationId).optional(),
        pageNumber: ZPageNumber.optional(),
        pageSize: ZPageSize.optional(),
      },
    },
    async ({ applicationVersionIds, applicationIds, pageNumber, pageSize }) => {
      try {
        const result = await ApplicationsService.getApplicationVersions({
          ids: applicationVersionIds,
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

  server.registerTool(
    'get_application_consumer',
    {
      description: 'Get a specific application consumer by its ID',
      inputSchema: {
        consumerId: ZConsumerId,
      },
    },
    async ({ consumerId }) => {
      try {
        const result = await ConsumersService.getConsumer({
          id: consumerId,
        });
        return ok(result);
      } catch (error) {
        return err(error);
      }
    },
  );

  server.registerTool(
    'get_application_consumers',
    {
      description: 'List application consumers with optional filters',
      inputSchema: {
        versionIds: z.array(ZApplicationVersion).optional(),
        applicationVersionIds: z.array(ZApplicationVersionId).optional(),
        pageNumber: ZPageNumber.optional(),
        pageSize: ZPageSize.optional(),
      },
    },
    async ({ versionIds, applicationVersionIds, pageNumber, pageSize }) => {
      try {
        const result = await ConsumersService.getConsumers({
          ids: versionIds,
          applicationVersionIds,
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
