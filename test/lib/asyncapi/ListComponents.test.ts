import { describe, expect, it, vi } from 'vitest';
import { AsyncApiSpecification } from '../../../src/lib/asyncapi/AsyncApiSpecification';
import { AsyncApiSpecificationReader } from '../../../src/lib/asyncapi/AsyncApiSpecificationReader';
import { ListComponents } from '../../../src/lib/asyncapi/ListComponents';

describe('ListComponents', () => {
  it('outputs every message name and returns the list', () => {
    const reader = readerFor({
      asyncapi: '3.0.0',
      components: { messages: { OrderCreated: {}, OrderCancelled: {} } },
    });
    const output = vi.fn();

    const names = new ListComponents('messages', reader, output).execute('asyncapi.json');

    expect(names).toEqual(['OrderCreated', 'OrderCancelled']);
    expect(output).toHaveBeenNthCalledWith(1, 'OrderCreated');
    expect(output).toHaveBeenNthCalledWith(2, 'OrderCancelled');
  });

  it('uses the same logic to output schema names', () => {
    const reader = readerFor({
      asyncapi: '2.6.0',
      components: { schemas: { Order: {}, Customer: {} } },
    });
    const output = vi.fn();

    new ListComponents('schemas', reader, output).execute('asyncapi.json');

    expect(output.mock.calls).toEqual([['Order'], ['Customer']]);
  });
});

function readerFor(document: unknown): AsyncApiSpecificationReader {
  const reader = new AsyncApiSpecificationReader();
  vi.spyOn(reader, 'read').mockReturnValue(new AsyncApiSpecification(document));
  return reader;
}
