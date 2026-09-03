import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { err, ok } from './helpers';
import { SearchService } from '../lib/search.service';

export function registerSearchTools(server: McpServer) {
  const BaseQuery = z.object({
    pageNumber: z.number().default(1),
    pageSize: z.number().default(20),
  });

  server.registerTool(
    'search_applications',
    {
      description: 'Search for applications by name or search term, with pagination support.',
      inputSchema: {
        searchTerm: z.string(),
        ...BaseQuery.shape,
      },
    },
    async ({ searchTerm, ...queryParams }) => {
      try {
        const results = await SearchService.searchApplications(searchTerm, queryParams);
        return ok(results);
      } catch (error) {
        return err(error);
      }
    },
  );

  server.registerTool(
    'search_events',
    {
      description: 'Search for events by name or search term, with pagination support.',
      inputSchema: {
        searchTerm: z.string(),
        ...BaseQuery.shape,
      },
    },
    async ({ searchTerm, ...queryParams }) => {
      try {
        const results = await SearchService.searchEvents(searchTerm, queryParams);
        return ok(results);
      } catch (error) {
        return err(error);
      }
    },
  );

  server.registerTool(
    'search_schemas',
    {
      description: 'Search for schemas by name or search term, with pagination support.',
      inputSchema: {
        searchTerm: z.string(),
        ...BaseQuery.shape,
      },
    },
    async ({ searchTerm, ...queryParams }) => {
      try {
        const results = await SearchService.searchSchemas(searchTerm, queryParams);
        return ok(results);
      } catch (error) {
        return err(error);
      }
    },
  );

  server.registerTool(
    'search_enumerations',
    {
      description:
        'Search for topic address enumerations by name or search term, with pagination support.',
      inputSchema: {
        searchTerm: z.string(),
        ...BaseQuery.shape,
      },
    },
    async ({ searchTerm, ...queryParams }) => {
      try {
        const results = await SearchService.searchEnumerations(searchTerm, queryParams);
        return ok(results);
      } catch (error) {
        return err(error);
      }
    },
  );

  server.registerTool(
    'search_event_apis',
    {
      description: 'Search for event APIs by name or search term, with pagination support.',
      inputSchema: {
        searchTerm: z.string(),
        ...BaseQuery.shape,
      },
    },
    async ({ searchTerm, ...queryParams }) => {
      try {
        const results = await SearchService.searchEventAPIs(searchTerm, queryParams);
        return ok(results);
      } catch (error) {
        return err(error);
      }
    },
  );

  server.registerTool(
    'search_event_api_products',
    {
      description: 'Search for event API products by name or search term, with pagination support.',
      inputSchema: {
        searchTerm: z.string(),
        ...BaseQuery.shape,
      },
    },
    async ({ searchTerm, ...queryParams }) => {
      try {
        const results = await SearchService.searchEventAPIProducts(searchTerm, queryParams);
        return ok(results);
      } catch (error) {
        return err(error);
      }
    },
  );
}
