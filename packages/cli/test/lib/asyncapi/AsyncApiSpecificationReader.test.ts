import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { InvalidAsyncApiSpecification } from '@event-specification-gedoens/migration-core';
import { AsyncApiSpecificationReader } from '../../../src/lib/asyncapi/AsyncApiSpecificationReader';

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

  it('reads a YAML AsyncAPI specification from disk', () => {
    const filePath = createTemporaryFile(
      'asyncapi: 3.0.0\ncomponents:\n  schemas:\n    User: {}\n',
      'yaml',
    );

    expect(new AsyncApiSpecificationReader().read(filePath).list('schemas')).toEqual(['User']);
  });
});

function createTemporaryFile(content: string, extension = 'json'): string {
  const directory = mkdtempSync(join(tmpdir(), 'event-specification-gedoens-'));
  const filePath = join(directory, `asyncapi.${extension}`);
  writeFileSync(filePath, content);
  return filePath;
}
