import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
// import { ApiError } from '@solace-labs/ep-openapi-node';
import { logger } from '../lib/logger';

/**
 * Wraps a value as an MCP text content result.
 */
export function ok(data: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

/**
 * Wraps an error as an MCP error result.
 */
export function err(error: unknown): CallToolResult {
  const message = error instanceof Error ? error.message : String(error);
  // const isApiError = error instanceof ApiError;
  logger.error('Error: %s %o', message, error);
  return { isError: true, content: [{ type: 'text', text: `Error: ${message}` }] };
}
