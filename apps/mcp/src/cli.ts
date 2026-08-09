#!/usr/bin/env node

import { boolean, run } from '@drizzle-team/brocli';
import chalk from 'chalk';
import {
  name as cliName,
  description as cliDescription,
  version as cliVersion,
} from '../package.json';
import { RunCommand } from './commands/run.cmd';
import { config } from './appConfig';
import type { LogLevel } from './lib/getLogLevel';
import { logger } from './lib/logger';

void run([RunCommand], {
  name: cliName,
  description: cliDescription,
  version: () => {
    console.log(chalk.bgBlue(` v${cliVersion} `), '\n');
  },
  globals: {
    verbose: boolean('verbose').desc('Enable verbose output').default(false),
    silent: boolean().desc('Enable silent mode. This will overrule verbose').default(false),
  },
  hook(event, _command, globals) {
    if (event !== 'before') return;

    const { silent, verbose } = globals;
    const level: LogLevel = silent ? 'silent' : verbose ? 'debug' : 'info';
    config.setLogLevel(level);
    logger.level = level;
  },
});
