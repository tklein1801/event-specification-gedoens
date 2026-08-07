import {
  ApplicationDomainsService,
  TopicDomainsService,
  AddressLevel,
} from '@solace-labs/ep-openapi-node';
import { config } from '../config';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { err, ok } from './helpers';
import {
  ZApplicationDomainName,
  ZApplicationDomainDescription,
  ZTopicDomainEnforcementEnabled,
  ZUniqueTopicAddressEnforcementEnabled,
  ZApplicationDomainId,
  ZTopicDomainId,
} from '../schemas/ApplicationDomain.schema';
import { ZBrokerType, ZPageNumber, ZPageSize } from '../schemas/Shared.schema';
import z from 'zod';

export function registerApplicationDomainTools(server: McpServer): void {
  if (config.tools.allow_create) {
    server.registerTool(
      'create_application_domain',
      {
        description: 'Create a new application domain',
        inputSchema: {
          name: ZApplicationDomainName,
          description: ZApplicationDomainDescription.optional(),
          topicDomainEnforcementEnabled: ZTopicDomainEnforcementEnabled.optional(),
          uniqueTopicAddressEnforcementEnabled: ZUniqueTopicAddressEnforcementEnabled.optional(),
          // brokerType: ZBrokerType,
          // baseTopicDomain: ZApplicationDomainName.optional(),
        },
      },
      async ({
        name,
        description,
        topicDomainEnforcementEnabled,
        uniqueTopicAddressEnforcementEnabled,
        // brokerType,
        // baseTopicDomain,
      }) => {
        try {
          // const result = { applicationDomain: {}, topicDomain: {} };
          const createdApplicationDomain = await ApplicationDomainsService.createApplicationDomain({
            requestBody: {
              name,
              description,
              topicDomainEnforcementEnabled,
              uniqueTopicAddressEnforcementEnabled,
            },
          });
          // result.applicationDomain = createdApplicationDomain;

          // if (createdApplicationDomain.data && createdApplicationDomain.data.id) {
          //   const topicSegments = baseTopicDomain ? baseTopicDomain.split('/') : [];
          //   const createdTopicDomain = await TopicDomainsService.createTopicDomain({
          //     requestBody: {
          //       applicationDomainId: createdApplicationDomain.data.id,
          //       brokerType,
          //       addressLevels: topicSegments.map(
          //         (segment) =>
          //           ({
          //             name: segment,
          //             addressLevelType: AddressLevel.addressLevelType.LITERAL,
          //           }) as AddressLevel,
          //       ),
          //     },
          //   });
          //   result.topicDomain = createdTopicDomain;
          // } else logger.warn(`No data returned from createApplicationDomain for name: ${name}`);

          return ok(createdApplicationDomain);
        } catch (error) {
          return err(error);
        }
      },
    );

    server.registerTool(
      'create_topic_domain',
      {
        description: 'Create a new topic domain for an application domain',
        inputSchema: {
          applicationDomainId: ZApplicationDomainId,
          brokerType: ZBrokerType,
          baseTopicDomain: ZApplicationDomainName.optional(),
        },
      },
      async ({ applicationDomainId, brokerType, baseTopicDomain }) => {
        try {
          const topicSegments = baseTopicDomain ? baseTopicDomain.split('/') : [];
          const result = await TopicDomainsService.createTopicDomain({
            requestBody: {
              applicationDomainId,
              brokerType,
              addressLevels: topicSegments.map(
                (segment) =>
                  ({
                    name: segment,
                    addressLevelType: AddressLevel.addressLevelType.LITERAL,
                  }) as AddressLevel,
              ),
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
      'update_application_domain',
      {
        description: 'Update an existing application domain',
        inputSchema: {
          id: ZApplicationDomainId,
          name: ZApplicationDomainName,
          description: ZApplicationDomainDescription.optional(),
          topicDomainEnforcementEnabled: ZTopicDomainEnforcementEnabled.optional(),
          uniqueTopicAddressEnforcementEnabled: ZUniqueTopicAddressEnforcementEnabled.optional(),
        },
      },
      async ({
        id,
        name,
        description,
        topicDomainEnforcementEnabled,
        uniqueTopicAddressEnforcementEnabled,
      }) => {
        try {
          const result = await ApplicationDomainsService.updateApplicationDomain({
            id,
            requestBody: {
              name,
              description,
              topicDomainEnforcementEnabled,
              uniqueTopicAddressEnforcementEnabled,
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
      'delete_application_domain',
      {
        description: 'Delete an application domain by ID',
        inputSchema: {
          id: ZApplicationDomainId,
        },
      },
      async ({ id }) => {
        try {
          const result = await ApplicationDomainsService.deleteApplicationDomain({
            id,
          });
          return ok(result);
        } catch (error) {
          return err(error);
        }
      },
    );

    server.registerTool(
      'delete_application_topic_domain',
      {
        description: 'Delete a topic domain for an application domain by ID',
        inputSchema: {
          id: ZTopicDomainId,
        },
      },
      async ({ id }) => {
        try {
          const result = await TopicDomainsService.deleteTopicDomain({
            id,
          });
          return ok(result);
        } catch (error) {
          return err(error);
        }
      },
    );
  }

  server.registerTool(
    'get_application_domain',
    {
      description: 'Get a specific application domain by its ID',
      inputSchema: {
        applicationDomainId: ZApplicationDomainId,
      },
    },
    async ({ applicationDomainId }) => {
      try {
        const result = await ApplicationDomainsService.getApplicationDomain({
          id: applicationDomainId,
        });
        return ok(result);
      } catch (error) {
        return err(error);
      }
    },
  );

  server.registerTool(
    'get_application_domains',
    {
      description: 'List all application domains',
      inputSchema: {
        name: ZApplicationDomainName.optional(),
        pageNumber: ZPageNumber.optional(),
        pageSize: ZPageSize.optional(),
      },
    },
    async ({ name, pageNumber, pageSize }) => {
      try {
        const result = await ApplicationDomainsService.getApplicationDomains({
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
    'get_topic_domain',
    {
      description: 'Get a specific topic domain by its ID',
      inputSchema: {
        topicDomainId: ZTopicDomainId,
      },
    },
    async ({ topicDomainId }) => {
      try {
        const result = await TopicDomainsService.getTopicDomain({
          id: topicDomainId,
        });
        return ok(result);
      } catch (error) {
        return err(error);
      }
    },
  );

  server.registerTool(
    'get_topic_domains',
    {
      description: 'List topic domains with optional filters',
      inputSchema: {
        applicationDomainId: ZApplicationDomainId,
        applicationDomainIds: z.array(ZApplicationDomainId).optional(),
        topicDomainIds: z.array(ZTopicDomainId).optional(),
        pageNumber: ZPageNumber.optional(),
        pageSize: ZPageSize.optional(),
      },
    },
    async ({ applicationDomainId, applicationDomainIds, topicDomainIds, pageNumber, pageSize }) => {
      try {
        const result = await TopicDomainsService.getTopicDomains({
          applicationDomainId,
          applicationDomainIds,
          ids: topicDomainIds,
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
