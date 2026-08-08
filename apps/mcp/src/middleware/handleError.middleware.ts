import type { NextFunction, Request, Response } from 'express';
import { config } from '../appConfig';
import { logger } from '../lib/logger';
import { getErrorDetails } from '../lib/toolLogging';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function handleError(err: Error, req: Request, res: Response, _next: NextFunction): void {
  logger.error('Unhandled request error', {
    middleware: 'handleError',
    method: req.method,
    url: req.originalUrl,
    error: getErrorDetails(err),
  });
  res.status(500).json({
    service: config.service,
    version: config.version,
    error: 'Internal Server Error',
    message: err.message,
  });
}
