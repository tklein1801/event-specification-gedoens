import { createAsyncApiCommand } from '../asyncapi.command';
import { ListEvents as ListEventsService } from '../../lib/asyncapi/ListEvents';

const listEvents = new ListEventsService();

export const ListEvents = createAsyncApiCommand({
  name: 'list-events',
  aliases: ['le'],
  description: 'List published and consumed events from a JSON AsyncAPI specification',
  execute: (specification) => listEvents.execute(specification),
});
