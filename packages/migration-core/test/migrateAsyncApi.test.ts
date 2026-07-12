import { describe, expect, it } from 'vitest';
import {
  InvalidAsyncApiSpecification,
  migrateAsyncApi,
  migrateAsyncApiText,
  parseAsyncApi,
} from '../src';

describe('migration-core public API', () => {
  it('accepts a JSON string and returns a migrated document', () => {
    const result = migrateAsyncApi('{"asyncapi":"2.6.0"}', 'to-structured');
    expect(result.asyncapi).toBe('3.0.0');
  });

  it('accepts a YAML string and returns formatted YAML', () => {
    const result = migrateAsyncApiText(
      'asyncapi: 2.6.0\ninfo:\n  title: Orders\n  version: 1.0.0\n',
      'to-structured',
    );

    expect(result.format).toBe('yaml');
    expect(result.content).toContain('asyncapi: 3.0.0');
    expect(parseAsyncApi(result.content)).toMatchObject({ asyncapi: '3.0.0' });
  });

  it('accepts an object without mutating it', () => {
    const source = { asyncapi: '2.6.0', channels: {} };
    const result = migrateAsyncApi(source, 'to-structured');

    expect(result).not.toBe(source);
    expect(source.asyncapi).toBe('2.6.0');
  });

  it.each([
    ['', 'EMPTY_INPUT'],
    ['asyncapi: [', 'INVALID_SYNTAX'],
    ['title: Missing version', 'INVALID_DOCUMENT'],
  ])('reports invalid input %# with a stable code', (input, code) => {
    try {
      migrateAsyncApi(input, 'to-structured');
      throw new Error('Expected migration to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidAsyncApiSpecification);
      expect((error as InvalidAsyncApiSpecification).code).toBe(code);
    }
  });
});
