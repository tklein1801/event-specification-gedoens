import { z } from 'zod';
import { Application } from '@solace-labs/ep-openapi-node';

export const ZApplicationId = z.string().describe('The ID of the application.');
export const ZApplicationName = z.string().describe('The name of the application.');
// TODO: What is the application type
export const ZApplicationType = z.string().describe('The type of the application.');
export const ZApplicationBrokerType = z
  .enum(Application.brokerType)
  .describe('The broker type of the application.');
export const ZApplicationVersion = z.string().describe('The version of the application.');
export const ZApplicationDescription = z.string().describe('The description of the application.');
export const ZApplicationDisplayName = z.string().describe('The display name of the application.');
