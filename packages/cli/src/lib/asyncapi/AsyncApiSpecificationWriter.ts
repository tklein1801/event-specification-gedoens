import { writeFileSync } from 'node:fs';
import { extname } from 'node:path';
import {
  serializeAsyncApi,
  type AsyncApiDocument,
  type SpecificationFormat,
} from '@event-specification-gedoens/migration-core';
import { log } from '../decorators/log.decorator';

export interface SpecificationWriter {
  write(filePath: string, document: AsyncApiDocument): void;
}

export class AsyncApiSpecificationWriter implements SpecificationWriter {
  @log
  write(filePath: string, document: AsyncApiDocument): void {
    writeFileSync(filePath, serializeAsyncApi(document, this.formatFor(filePath)), 'utf8');
  }

  private formatFor(filePath: string): SpecificationFormat {
    const extension = extname(filePath).toLowerCase();
    return extension === '.yaml' || extension === '.yml' ? 'yaml' : 'json';
  }
}
