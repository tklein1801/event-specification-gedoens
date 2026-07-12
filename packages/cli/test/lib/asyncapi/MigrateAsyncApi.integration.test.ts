import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  InvalidAsyncApiSpecification,
  parseAsyncApi,
} from '@event-specification-gedoens/migration-core';
import { MigrateAsyncApi } from '../../../src/lib/asyncapi/MigrateAsyncApi';

describe('MigrateAsyncApi file I/O', () => {
  it('migrates and overwrites a JSON file through migration-core', () => {
    const file = temporaryFile('json', '{"asyncapi":"2.6.0"}');

    const result = new MigrateAsyncApi().execute(file, 'to-structured');

    expect(result.asyncapi).toBe('3.0.0');
    expect(JSON.parse(readFileSync(file, 'utf8'))).toMatchObject({ asyncapi: '3.0.0' });
  });

  it('migrates and preserves YAML output for YAML files', () => {
    const file = temporaryFile(
      'yaml',
      'asyncapi: 2.6.0\ninfo:\n  title: Orders\n  version: 1.0.0\n',
    );

    new MigrateAsyncApi().execute(file, 'to-structured');

    const output = readFileSync(file, 'utf8');
    expect(output).toContain('asyncapi: 3.0.0');
    expect(parseAsyncApi(output)).toMatchObject({ asyncapi: '3.0.0' });
  });

  it('does not overwrite a file when migration fails', () => {
    const content = '{"asyncapi":"3.0.0"}';
    const file = temporaryFile('json', content);

    expect(() => new MigrateAsyncApi().execute(file, 'to-structured')).toThrow(
      InvalidAsyncApiSpecification,
    );
    expect(readFileSync(file, 'utf8')).toBe(content);
  });
});

function temporaryFile(extension: string, content: string): string {
  const directory = mkdtempSync(join(tmpdir(), 'event-specification-gedoens-'));
  const file = join(directory, `asyncapi.${extension}`);
  writeFileSync(file, content, 'utf8');
  return file;
}
