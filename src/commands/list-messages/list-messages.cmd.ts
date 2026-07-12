import { createListComponentsCommand } from '../list-components.command';

export const ListMessages = createListComponentsCommand({
  name: 'list-messages',
  aliases: ['lm'],
  component: 'messages',
  description: 'List messages from a JSON AsyncAPI specification',
});
