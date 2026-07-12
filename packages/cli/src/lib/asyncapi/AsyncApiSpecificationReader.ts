import { readFileSync } from 'node:fs';
import { AsyncApiSpecification, parseAsyncApi } from '@event-specification-gedoens/migration-core';
import { log } from '../decorators/log.decorator';

export class AsyncApiSpecificationReader {
  @log
  read(filePath: string): AsyncApiSpecification {
    const content = readFileSync(filePath, 'utf8');
    return new AsyncApiSpecification(parseAsyncApi(content));
  }
}
