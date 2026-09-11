import { z } from 'zod';

export const ZEnumId = z.string().describe('The ID of the enumeration.');
export const ZEnumVersionId = z.string().describe('The ID of the enumeration version.');
export const ZEnumName = z.string().describe('The name of the enumeration.');
export const ZEnumVersion = z.string().describe('The version of the enumeration.');
export const ZEnumDisplayName = z.string().describe('The display name of the enumeration version.');
export const ZEnumDescription = z.string().describe('The description of the enumeration version.');
export const ZEnumValue = z.object({
  value: z.string().describe('The value of the enumeration value.'),
  label: z.string().describe('The label of the enumeration value.').optional(),
});
export const ZEnumValues = z.array(ZEnumValue).describe('The values of the enumeration version.');
