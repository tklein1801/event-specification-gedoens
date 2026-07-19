import { createAsyncApiCommand } from '../asyncapi.command';
import { ListEvents as ListEventsService } from '../../lib/asyncapi/ListEvents';

const listEvents = new ListEventsService();

export const ListEvents = createAsyncApiCommand({
  name: 'list-events',
  aliases: ['le'],
  description: 'List the published and consumed events from an AsyncAPI specification',
  execute: (specification) => listEvents.execute(specification),
});
