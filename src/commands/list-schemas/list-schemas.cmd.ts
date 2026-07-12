import { command } from '@drizzle-team/brocli';

export const ListSchemas = command({
  name: 'list-schemas',
  aliases: ['ls'],
  desc: '',
  shortDesc: '',
  handler() {
    console.log('list schemas');
  },
});
