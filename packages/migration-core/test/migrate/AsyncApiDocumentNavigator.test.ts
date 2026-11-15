import { describe, expect, it } from 'vitest';
import { AsyncApiDocumentNavigator } from '../../src/migrate/AsyncApiDocumentNavigator';

describe('schema reference resolution', () => {
  const navigator = new AsyncApiDocumentNavigator({
    asyncapi: '2.6.0',
    components: {
      schemas: {
        Item: { type: 'string' },
        Circular: { $ref: '#/components/schemas/Circular' },
      },
    },
  });

  it('resolves schema positions without interpreting instance data as schemas', () => {
    const data = { $ref: '#/components/schemas/Item' };
    const schema = {
      properties: { item: { $ref: '#/components/schemas/Item' } },
      allOf: [{ items: { $ref: '#/components/schemas/Item' } }],
      default: data,
      const: data,
      enum: [data],
      examples: [data, { $ref: 'https://example.org/item' }],
    };
    expect(navigator.resolveSchemaReferences(schema)).toEqual({
      ...schema,
      properties: { item: { type: 'string' } },
      allOf: [{ items: { type: 'string' } }],
    });
  });

  it('rejects unresolved and circular schema references', () => {
    expect(() =>
      navigator.resolveSchemaReferences({ $ref: '#/components/schemas/Missing' }),
    ).toThrow('cannot be resolved');
    expect(() =>
      navigator.resolveSchemaReferences({ $ref: '#/components/schemas/Circular' }),
    ).toThrow('Circular schema reference');
  });
});
