import { z } from 'zod';

export const ZEventId = z.string().describe('The ID of the event.');
export const ZEventName = z.string().describe('The name of the event.');
export const ZEventDisplayName = z.string().describe('The display name of the event.');
export const ZEventVersion = z.string().describe('The version of the event.');
export const ZIsEventShared = z
  .boolean()
  .describe('Indicates whether the event is shared across application domains.');
export const ZEventBrokerType = z
  .enum(['SOLACE', 'KAFKA'])
  .describe('The broker type of the event.');
export const ZEventDescription = z.string().describe('The description of the event.');
