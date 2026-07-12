import { describe, expect, it, vi } from 'vitest';
import { AsyncApiSpecification } from '@event-specification-gedoens/migration-core';
import { AsyncApiSpecificationReader } from '../../../src/lib/asyncapi/AsyncApiSpecificationReader';
import { ListEvents } from '../../../src/lib/asyncapi/ListEvents';

describe('ListEvents', () => {
  it('outputs every event with its direction and returns the events', () => {
    const reader = new AsyncApiSpecificationReader();
    vi.spyOn(reader, 'read').mockReturnValue(
      new AsyncApiSpecification({
        asyncapi: '2.6.0',
        channels: {
          outgoing: { subscribe: { message: { name: 'OrderCreated' } } },
          incoming: { publish: { message: { name: 'PaymentReceived' } } },
        },
      }),
    );
    const output = vi.fn();

    const events = new ListEvents(reader, output).execute('asyncapi.json');

    expect(events).toEqual([
      { name: 'OrderCreated', direction: 'published' },
      { name: 'PaymentReceived', direction: 'consumed' },
    ]);
    expect(output.mock.calls).toEqual([
      [{ name: 'OrderCreated', direction: 'published' }],
      [{ name: 'PaymentReceived', direction: 'consumed' }],
    ]);
  });

  it('keeps both directions when the same event is published and consumed', () => {
    const reader = new AsyncApiSpecificationReader();
    vi.spyOn(reader, 'read').mockReturnValue(
      new AsyncApiSpecification({
        asyncapi: '3.0.0',
        channels: {
          orders: {
            messages: { OrderChanged: { name: 'OrderChanged' } },
          },
        },
        operations: {
          publishOrderChanged: {
            action: 'send',
            channel: { $ref: '#/channels/orders' },
          },
          consumeOrderChanged: {
            action: 'receive',
            channel: { $ref: '#/channels/orders' },
          },
        },
      }),
    );
    const output = vi.fn();

    const events = new ListEvents(reader, output).execute('asyncapi.json');

    expect(events).toEqual([
      { name: 'OrderChanged', direction: 'published' },
      { name: 'OrderChanged', direction: 'consumed' },
    ]);
    expect(output).toHaveBeenCalledTimes(2);
  });
});
