import { ApplicationDomainsService } from '@solace-labs/ep-openapi-node';
import { config } from '../config';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { err, ok } from './helpers';
import {
  ZApplicationDomainName,
  ZApplicationDomainDescription,
  ZTopicDomainEnforcementEnabled,
  ZUniqueTopicAddressEnforcementEnabled,
  ZApplicationDomainId,
} from '../schemas/ApplicationDomain.schema';
import { ZPageNumber, ZPageSize } from '../schemas/Shared.schema';

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
        },
      },
      async ({
        name,
        description,
        topicDomainEnforcementEnabled,
        uniqueTopicAddressEnforcementEnabled,
      }) => {
        try {
          const result = await ApplicationDomainsService.createApplicationDomain({
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
}
