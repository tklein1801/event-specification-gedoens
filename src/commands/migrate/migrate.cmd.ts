import { command } from '@drizzle-team/brocli';

export const Migrate = command({
  name: 'migrate',
  aliases: ['m'],
  desc: '',
  shortDesc: '',
  handler() {
    console.log('migrate');
  },
});
