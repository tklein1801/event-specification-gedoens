import { command, number } from '@drizzle-team/brocli';
import { config } from '../appConfig';
import { runServer } from '../runServer';

export const RunCommand = command({
  name: 'run',
  aliases: ['r'],
  desc: 'Run the MCP',
  shortDesc: 'Run the MCP',
  options: {
    port: number('port').desc('Port to run the MCP on').default(3000),
  },
  handler({ port }) {
    if (port !== config.port) {
      config.setPort(port);
    }

    runServer(config);
  },
});
