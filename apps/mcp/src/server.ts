#!/usr/bin/env node

import { runServer } from './runServer';
import { config } from './appConfig';
import { logger } from './lib/logger';
import { getErrorDetails } from './lib/toolLogging';

runServer(config).catch((error) => {
  logger.error('Failed to start MCP service', { error: getErrorDetails(error) });
  process.exit(1);
});
