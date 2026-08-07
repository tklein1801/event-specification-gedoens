import { z } from 'zod';

export const ZApplicationDomainId = z.string().describe('The ID of the application domain.');
export const ZApplicationDomainName = z.string().describe('The name of the application domain.');
export const ZApplicationDomainDescription = z
  .string()
  .describe('The description of the application domain.');
export const ZTopicDomainEnforcementEnabled = z
  .boolean()
  .describe(
    'Forces all topic addresses within the application domain to be prefixed with one of the application domain’s configured topic domains.',
  );
export const ZUniqueTopicAddressEnforcementEnabled = z
  .boolean()
  .describe('Forces all topic addresses within the application domain to be unique.');

export const ZTopicDomainId = z.string().describe('The ID of the topic domain.');
export const ZDomainTopic = z
  .string()
  .describe('/-separated topic domain string. Example: "tchibo/sap/ae"');
