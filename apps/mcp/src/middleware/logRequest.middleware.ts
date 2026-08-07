import type { NextFunction, Request, Response } from 'express';
import { logger } from '../lib/logger';
import { extractRequestAuth } from '../lib/requestAuth';
import { getToolCall } from '../lib/toolLogging';

export function logRequest(req: Request, res: Response, next: NextFunction): void {
  const startedAt = Date.now();
  const requestAuth = extractRequestAuth(req);
  const action = getAction(req);

  logger.info('Request started', {
    actor: requestAuth?.actor ?? 'anonymous',
    authMethod: requestAuth?.authMethod ?? 'none',
    action,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
  });

  res.on('finish', () => {
    const status = res.statusCode;
    const result = status >= 500 ? 'error' : status >= 400 ? 'rejected' : 'success';
    const msg = `Request completed (${result})`;
    const meta = {
      actor: requestAuth?.actor ?? 'anonymous',
      authMethod: requestAuth?.authMethod ?? 'none',
      action,
      method: req.method,
      url: req.originalUrl,
      status,
      result,
      durationMs: Date.now() - startedAt,
      ip: req.ip,
    };
    if (status >= 500) logger.error(msg, meta);
    else if (status >= 400) logger.warn(msg, meta);
    else logger.info(msg, meta);
  });
  next();
}

function getAction(req: Request): string {
  if (req.originalUrl !== '/mcp') {
    return `${req.method} ${req.originalUrl}`;
  }

  const method = (req.body as { method?: unknown } | undefined)?.method;
  if (typeof method !== 'string') {
    return `${req.method} /mcp`;
  }

  const toolCall = getToolCall(req.body);
  if (toolCall) {
    return `MCP tool call: ${toolCall.toolName}`;
  }

  return `MCP method: ${method}`;
}
