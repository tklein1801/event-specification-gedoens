import { z } from 'zod';
import { Address } from '@solace-labs/ep-openapi-node';
import { ZBrokerType } from './Shared.schema';

export const ZEventId = z.string().describe('The ID of the event.');
export const ZEventVersionId = z.string().describe('The ID of the event version.');
export const ZEventName = z.string().describe('The name of the event.');
export const ZEventDisplayName = z.string().describe('The display name of the event version.');
export const ZEventVersion = z.string().describe('The version of the event.');
export const ZIsEventShared = z
  .boolean()
  .describe('Indicates whether the event is shared across application domains.');
export const ZEventBrokerType = ZBrokerType;
export const ZEventDescription = z.string().describe('The description of the event.');
export const ZEventRequiresApproval = z
  .boolean()
  .describe('Indicates whether the event requires approval before it can be used.');

export const ZEventAddressType = z
  .enum(Address.addressType)
  .describe('The type of the event address.');
export const ZEventTopic = z
  .string()
  .describe('/-separated topic domain string. Example: "tchibo/sap/ae/demo/event/1"');
