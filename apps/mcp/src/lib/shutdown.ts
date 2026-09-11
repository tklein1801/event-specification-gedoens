import type { Server } from 'node:http';
import { logger } from './logger';
import { getErrorDetails } from './toolLogging';

const FORCE_EXIT_TIMEOUT_MS = 10_000;

let registered = false;

export function registerShutdownHandlers(server: Server): void {
  if (registered) return;
  registered = true;

  let shuttingDown = false;

  const shutdown = (signal: NodeJS.Signals): void => {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.warn(`Received ${signal}. Closing HTTP server gracefully...`);

    const forceExit = setTimeout(() => {
      logger.error('Graceful shutdown timed out. Forcing exit.');
      process.exit(1);
    }, FORCE_EXIT_TIMEOUT_MS);
    forceExit.unref();

    server.close((error) => {
      clearTimeout(forceExit);

      if (error) {
        logger.error('Failed to close the HTTP server', { error: getErrorDetails(error) });
        process.exit(1);
      }

      logger.info('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { error: getErrorDetails(reason) });
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error: getErrorDetails(error) });
    process.exit(1);
  });
}
