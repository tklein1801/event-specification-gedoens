import { createListComponentsCommand } from '../list-components.command';

export const ListSchemas = createListComponentsCommand({
  name: 'list-schemas',
  aliases: ['ls'],
  component: 'schemas',
  description: 'List schemas from an AsyncAPI specification',
});
