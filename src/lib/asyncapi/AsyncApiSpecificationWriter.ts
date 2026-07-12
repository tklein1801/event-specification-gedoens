import { writeFileSync } from 'node:fs';
import { log } from '../decorators/log.decorator';
import type { AsyncApiDocument } from './AsyncApiSpecification';

export interface SpecificationWriter {
  write(filePath: string, document: AsyncApiDocument): void;
}

export class AsyncApiSpecificationWriter implements SpecificationWriter {
  @log
  write(filePath: string, document: AsyncApiDocument): void {
    writeFileSync(filePath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
  }
}
