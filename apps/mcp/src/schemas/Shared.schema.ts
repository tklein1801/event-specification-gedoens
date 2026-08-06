import { z } from 'zod';

export const ZPageNumber = z.number().describe('The page number to get');
export const ZPageSize = z.number().describe('The number of items to get per page');
