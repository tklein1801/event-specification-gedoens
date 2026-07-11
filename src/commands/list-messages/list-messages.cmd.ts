import { command } from '@drizzle-team/brocli';

export const ListMessages = command({
  name: 'list-messages',
  aliases: ['lm'],
  desc: '',
  shortDesc: '',
  handler() {
    console.log('list messages');
  },
});
