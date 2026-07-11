import { command } from '@drizzle-team/brocli';
import { logger } from '../../lib/logger';

export const ListSchemas = command({
  name: 'list-schemas',
  aliases: ['ls'],
  desc: '',
  shortDesc: '',
  handler() {
    logger.info('list schemas');
  },
});
