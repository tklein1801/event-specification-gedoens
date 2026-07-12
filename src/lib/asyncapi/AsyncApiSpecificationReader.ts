import { readFileSync } from 'node:fs';
import { log } from '../decorators/log.decorator';
import { InvalidAsyncApiSpecification } from '../error/InvalidAsyncApiSpecification';
import { AsyncApiSpecification } from './AsyncApiSpecification';

export class AsyncApiSpecificationReader {
  @log
  read(filePath: string): AsyncApiSpecification {
    const json = readFileSync(filePath, 'utf8');

    try {
      return new AsyncApiSpecification(JSON.parse(json) as unknown);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new InvalidAsyncApiSpecification(
          `The file '${filePath}' does not contain valid JSON.`,
          {
            cause: error,
          },
        );
      }

      throw error;
    }
  }
}
