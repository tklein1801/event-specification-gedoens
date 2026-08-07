import { z } from 'zod';
import { ZBrokerType } from './Shared.schema';

export const ZApplicationId = z.string().describe('The ID of the application.');
export const ZApplicationVersionId = z.string().describe('The ID of the application version.');
export const ZApplicationName = z.string().describe('The name of the application.');
// TODO: What is the application type
export const ZApplicationType = z.enum(['standard']).describe('The type of the application.');
export const ZApplicationBrokerType = ZBrokerType;
export const ZApplicationVersion = z.string().describe('The version of the application.');
export const ZApplicationDescription = z.string().describe('The description of the application.');
export const ZApplicationDisplayName = z
  .string()
  .describe('The display name of the application version.');
export const ZApplicationConsumerName = z
  .string()
  .describe('The name of the application consumer.');
export const ZApplicationConsumerType = z
  .enum(['eventQueue', 'directClient'])
  .describe('The type of the application consumer.');

export const ZSubscriptionType = z.enum(['topic']).describe('The type of the subscription.');
export const ZSubscriptionValue = z.string().describe('The topic to be subscribed to.');
export const ZSubscription = z.object({
  subscriptionType: ZSubscriptionType,
  value: ZSubscriptionValue,
});

export const ZConsumerId = z.string().describe('The ID of the consumer.');
