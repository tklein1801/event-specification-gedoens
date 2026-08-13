import type { NextFunction, Request, Response } from 'express';
import { extractRequestAuth } from '../lib/requestAuth';
import { logger } from '../lib/logger';

/**
 * Middleware that enforces request authentication via Authorization, X-Api-Key,
 * or SOLACE_CLOUD_TOKEN.
 */
export function apiKeyMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestAuth = extractRequestAuth(req);

  if (!requestAuth) {
    logger.warn('MCP request rejected: missing authentication', {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
    });
    res.status(401).json({
      error:
        'Unauthorized – provide an Authorization token, X-Api-Key header, or SOLACE_CLOUD_TOKEN',
    });
    return;
  }

  res.locals.requestAuth = requestAuth;
  next();
}
