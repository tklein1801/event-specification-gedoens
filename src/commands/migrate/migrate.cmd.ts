import { command } from '@drizzle-team/brocli';
import { logger } from '../../lib/logger';

export const Migrate = command({
  name: 'migrate',
  aliases: ['m'],
  desc: '',
  shortDesc: '',
  handler() {
    logger.info('migrate');
  },
});
