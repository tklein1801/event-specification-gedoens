import { command, number, boolean, string } from '@drizzle-team/brocli';
import { config } from '../appConfig';
import { runServer } from '../runServer';
import { logger } from '../lib/logger';
import { transportTypes } from '../transport';

export const RunCommand = command({
  name: 'run',
  aliases: ['r'],
  desc: 'Run the MCP',
  shortDesc: 'Run the MCP',
  options: {
    port: number('port').desc('Port to run the MCP on').default(3000),
    allowWrite: boolean('allow-write')
      .desc('Enable write actions (create, update, delete) in the MCP')
      .default(false),
    type: string('type')
      .desc('Transport to use for the MCP (stdio or http)')
      .enum(...transportTypes)
      .default('http'),
  },
  handler({ port, allowWrite, type }) {
    if (port !== config.port) {
      config.setPort(port);
    }

    if (allowWrite) {
      config.enableTools({
        allow_create: true,
        allow_update: true,
        allow_delete: true,
      });

      logger.warn('Write actions (create, update, delete) are enabled in the MCP.');
    }

    return runServer(config, type);
  },
});
