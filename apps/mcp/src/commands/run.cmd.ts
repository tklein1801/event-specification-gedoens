import { command, number, boolean } from '@drizzle-team/brocli';
import { config } from '../appConfig';
import { runServer } from '../runServer';
import { logger } from '../lib/logger';

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
  },
  handler({ port, allowWrite }) {
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

    runServer(config);
  },
});
