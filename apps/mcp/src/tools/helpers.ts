import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../lib/logger';
import { logToolError, logToolSuccess } from '../lib/toolLogging';

/**
 * Wraps a value as an MCP text content result.
 */
export function ok(data: unknown): CallToolResult {
  const text = JSON.stringify(data, null, 2);
  logToolSuccess();
  return { content: [{ type: 'text', text }] };
}

/**
 * Wraps an error as an MCP error result.
 */
export function err(error: unknown): CallToolResult {
  const message = error instanceof Error ? error.message : String(error);
  logToolError(message, error);
  logger.debug('MCP tool error details captured', {
    errorType: error instanceof Error ? error.name : typeof error,
  });
  return { isError: true, content: [{ type: 'text', text: `Error: ${message}` }] };
}
