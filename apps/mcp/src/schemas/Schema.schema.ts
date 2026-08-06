import { z } from 'zod';

export const ZSchemaId = z.string().describe('The ID of the schema.');
export const ZSchemaVersion = z.string().describe('The version of the schema.');
export const ZSchemaContent = z
  .string()
  .describe('The content of the schema. Stringified JSON or YAML depending on the schema type.');
export const ZSchemaName = z.string().describe('The name of the schema.');
export const ZSchemaDisplayName = z.string().describe('The display name of the schema.');
export const ZSchemaDescription = z.string().describe('The description of the schema.');
export const ZSchemaType = z.enum(['JSON', 'YAML']).describe('The type of the schema.');
export const ZShared = z
  .boolean()
  .describe('Indicates whether the schema is shared across application domains.');
