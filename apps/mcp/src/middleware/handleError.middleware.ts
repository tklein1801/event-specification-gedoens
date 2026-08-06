import type { Request, Response } from 'express';
import { config } from '../config';
import { logger } from '../lib/logger';

export function handleError(err: Error, _req: Request, res: Response): void {
  logger.child({ middleware: 'handleError' }).error('Unhandled error: %s %o', err.name, err);
  res.status(500).json({
    service: config.service,
    version: config.version,
    error: 'Internal Server Error',
    message: err.message,
  });
}
