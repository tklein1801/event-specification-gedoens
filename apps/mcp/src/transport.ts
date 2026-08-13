import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

export const transportTypes = ['stdio', 'http'] as const;
export type TransportType = (typeof transportTypes)[number];

export function createHttpTransport() {
  return new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
}

export function createTransport(type: TransportType) {
  if (type === 'stdio') {
    return new StdioServerTransport();
  }

  return createHttpTransport();
}
