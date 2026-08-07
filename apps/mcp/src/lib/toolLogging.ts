import { AsyncLocalStorage } from 'node:async_hooks';
import { logger } from './logger';

type ToolLoggingContext = {
  toolName: string;
  startedAt: number;
};

const toolLoggingStorage = new AsyncLocalStorage<ToolLoggingContext>();

export type ToolCall = {
  toolName: string;
  arguments: unknown;
};

export function getToolCall(body: unknown): ToolCall | undefined {
  if (!isRecord(body) || body.method !== 'tools/call' || !isRecord(body.params)) {
    return undefined;
  }

  const toolName = body.params.name;
  if (typeof toolName !== 'string' || toolName.length === 0) {
    return undefined;
  }

  return {
    toolName,
    arguments: body.params.arguments,
  };
}

export async function runWithToolLoggingContext<T>(
  toolCall: ToolCall | undefined,
  callback: () => Promise<T>,
): Promise<T> {
  if (!toolCall) {
    return callback();
  }

  const context: ToolLoggingContext = {
    toolName: toolCall.toolName,
    startedAt: Date.now(),
  };

  logger.debug('MCP tool invocation started', {
    tool: context.toolName,
    argumentKeys: getArgumentKeys(toolCall.arguments),
  });

  return toolLoggingStorage.run(context, async () => {
    try {
      const result = await callback();
      logger.debug('MCP tool invocation finished', {
        tool: context.toolName,
        durationMs: Date.now() - context.startedAt,
      });
      return result;
    } catch (error) {
      logger.error('MCP tool invocation failed', {
        tool: context.toolName,
        durationMs: Date.now() - context.startedAt,
        error: getErrorDetails(error),
      });
      throw error;
    }
  });
}

export function logToolSuccess(): void {
  const context = toolLoggingStorage.getStore();
  if (!context) {
    return;
  }

  logger.info('MCP tool operation completed: %s', describeToolOperation(context.toolName), {
    tool: context.toolName,
    durationMs: Date.now() - context.startedAt,
  });
}

export function logToolError(message: string, error: unknown): void {
  const context = toolLoggingStorage.getStore();
  const metadata = context
    ? {
        tool: context.toolName,
        durationMs: Date.now() - context.startedAt,
        error: getErrorDetails(error),
      }
    : { error: getErrorDetails(error) };

  logger.error('MCP tool operation failed: %s', message, metadata);
}

export function getErrorDetails(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      ...(error.stack ? { stack: error.stack } : {}),
    };
  }

  if (isRecord(error)) {
    return error;
  }

  return { value: String(error) };
}

function describeToolOperation(toolName: string): string {
  const [verb, ...resourceParts] = toolName.split('_');
  const resource = resourceParts.join(' ');

  switch (verb) {
    case 'create':
      return `${resource} created`;
    case 'update':
      return `${resource} updated`;
    case 'delete':
      return `${resource} deleted`;
    case 'get':
      return `${resource} retrieved`;
    default:
      return `${toolName} completed`;
  }
}

function getArgumentKeys(argumentsValue: unknown): string[] {
  return isRecord(argumentsValue) ? Object.keys(argumentsValue) : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
