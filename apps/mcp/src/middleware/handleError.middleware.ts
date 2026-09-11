import type { NextFunction, Request, Response } from 'express';
import { config } from '../appConfig';
import { logger } from '../lib/logger';
import { getErrorDetails } from '../lib/toolLogging';

type ErrorWithStatus = Error & {
  status?: unknown;
  statusCode?: unknown;
};

function getStatusCode(error: ErrorWithStatus): number {
  const candidate = error.status ?? error.statusCode;
  return typeof candidate === 'number' && candidate >= 400 && candidate <= 599 ? candidate : 500;
}

export function handleError(
  err: ErrorWithStatus,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const status = getStatusCode(err);
  const isServerError = status >= 500;

  logger.error('Unhandled request error', {
    middleware: 'handleError',
    method: req.method,
    url: req.originalUrl,
    status,
    error: getErrorDetails(err),
  });

  const body: Record<string, unknown> = {
    service: config.service,
    version: config.version,
    error: isServerError ? 'Internal Server Error' : err.message,
  };

  if (isServerError && config.runtime !== 'production') {
    body.message = err.message;
  }

  res.status(status).json(body);
}
