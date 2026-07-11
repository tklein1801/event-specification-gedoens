#!/usr/bin/env node

import { boolean, run } from '@drizzle-team/brocli';
import {
  name as cliName,
  description as cliDescription,
  version as cliVersion,
} from '../package.json';
import { ListMessages } from './commands/list-messages/list-messages.cmd';
import { ListSchemas } from './commands/list-schemas/list-schemas.cmd';
import { Migrate } from './commands/migrate/migrate.cmd';
import { logger } from './lib/logger';

void run([ListMessages, ListSchemas, Migrate], {
  name: cliName,
  description: cliDescription,
  version: () => {
    console.log(cliVersion);
  },
  globals: {
    verbose: boolean('verbose').desc('Enable verbose output').default(false),
    silent: boolean().desc('Enable silent mode. This will overrule verbose').default(false),
  },
  hook(event, _command, globals) {
    if (event !== 'before') return;

    const { silent, verbose } = globals;

    logger.level = silent ? 'silent' : verbose ? 'debug' : 'info';
  },
});
