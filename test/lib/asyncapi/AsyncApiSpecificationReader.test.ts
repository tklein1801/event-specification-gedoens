import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AsyncApiSpecificationReader } from '../../../src/lib/asyncapi/AsyncApiSpecificationReader';
import { InvalidAsyncApiSpecification } from '../../../src/lib/error/InvalidAsyncApiSpecification';

describe('AsyncApiSpecificationReader', () => {
  it('reads a JSON AsyncAPI specification from disk', () => {
    const filePath = createTemporaryFile(
      '{"asyncapi":"3.0.0","components":{"schemas":{"User":{}}}}',
    );

    const specification = new AsyncApiSpecificationReader().read(filePath);

    expect(specification.list('schemas')).toEqual(['User']);
  });

  it('reports invalid JSON', () => {
    const filePath = createTemporaryFile('{invalid');

    expect(() => new AsyncApiSpecificationReader().read(filePath)).toThrow(
      InvalidAsyncApiSpecification,
    );
  });
});

function createTemporaryFile(content: string): string {
  const directory = mkdtempSync(join(tmpdir(), 'event-specification-gedoens-'));
  const filePath = join(directory, 'asyncapi.json');
  writeFileSync(filePath, content);
  return filePath;
}
