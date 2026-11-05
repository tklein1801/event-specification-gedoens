import { z } from 'zod';

export const ZAsyncApiFormat = z.enum(['yaml', 'json']).default('yaml');
export const ZAsyncApiVersion = z.enum(['2.0.0', '2.2.0', '2.5.0']).default('2.5.0');
export const ZIncludedExtensions = z.enum(['all', 'parent', 'version', 'none']).default('all');
