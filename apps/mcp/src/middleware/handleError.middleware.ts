import type { NextFunction, Request, Response } from 'express';
import { config } from '../config';
import { logger } from '../lib/logger';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function handleError(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  logger.child({ middleware: 'handleError' }).error('Unhandled error: %s %o', err.name, err);
  res.status(500).json({
    service: config.service,
    version: config.version,
    error: 'Internal Server Error',
    message: err.message,
  });
}
