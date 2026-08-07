import { Application } from '@solace-labs/ep-openapi-node';
import { z } from 'zod';

export const ZBrokerType = z
  .enum(Application.brokerType)
  .describe('The broker type of the application.');

export const ZPageNumber = z.number().describe('The page number to get');
export const ZPageSize = z.number().describe('The number of items to get per page');
