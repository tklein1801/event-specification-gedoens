import { command } from '@drizzle-team/brocli';
import { logger } from '../../lib/logger';

export const ListMessages = command({
  name: 'list-messages',
  aliases: ['lm'],
  desc: '',
  shortDesc: '',
  handler() {
    logger.info('list messages');
  },
});
