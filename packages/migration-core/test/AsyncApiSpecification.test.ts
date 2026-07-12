import { describe, expect, it } from 'vitest';
import { AsyncApiSpecification } from '../src/AsyncApiSpecification';
import { InvalidAsyncApiSpecification } from '../src/InvalidAsyncApiSpecification';

describe('AsyncApiSpecification', () => {
  it('lists message component names', () => {
    const specification = new AsyncApiSpecification({
      asyncapi: '3.0.0',
      components: {
        messages: {
          UserCreated: {},
          UserDeleted: {},
        },
      },
    });

    expect(specification.list('messages')).toEqual(['UserCreated', 'UserDeleted']);
  });

  it('lists schema component names', () => {
    const specification = new AsyncApiSpecification({
      asyncapi: '2.6.0',
      components: {
        schemas: {
          User: { type: 'object' },
          Address: { type: 'object' },
        },
      },
    });

    expect(specification.list('schemas')).toEqual(['User', 'Address']);
  });

  it('returns an empty list when the component section is absent', () => {
    const specification = new AsyncApiSpecification({ asyncapi: '3.0.0' });

    expect(specification.list('messages')).toEqual([]);
  });

  it('rejects documents without an AsyncAPI version', () => {
    expect(() => new AsyncApiSpecification({ components: {} })).toThrow(
      InvalidAsyncApiSpecification,
    );
  });

  it('rejects a component section that is not an object', () => {
    const specification = new AsyncApiSpecification({
      asyncapi: '3.0.0',
      components: { schemas: [] },
    });

    expect(() => specification.list('schemas')).toThrow(
      'The components.schemas value must be an object.',
    );
  });

  it('lists published and consumed events from AsyncAPI 2 operations', () => {
    const specification = new AsyncApiSpecification({
      asyncapi: '2.6.0',
      channels: {
        'orders/created': {
          subscribe: {
            message: { $ref: '#/components/messages/OrderCreated' },
          },
        },
        'payments/received': {
          publish: {
            message: {
              oneOf: [
                { name: 'PaymentReceived' },
                { $ref: '#/components/messages/PaymentRejected' },
              ],
            },
          },
        },
      },
      components: {
        messages: {
          OrderCreated: { name: 'com.example.OrderCreated' },
          PaymentRejected: {},
        },
      },
    });

    expect(specification.listEvents()).toEqual([
      { name: 'com.example.OrderCreated', direction: 'published' },
      { name: 'PaymentReceived', direction: 'consumed' },
      { name: 'PaymentRejected', direction: 'consumed' },
    ]);
  });

  it('lists send and receive events from AsyncAPI 3 operations', () => {
    const specification = new AsyncApiSpecification({
      asyncapi: '3.0.0',
      channels: {
        orders: {
          messages: {
            OrderCreated: { $ref: '#/components/messages/OrderCreated' },
            OrderCancelled: { $ref: '#/components/messages/OrderCancelled' },
          },
        },
      },
      operations: {
        sendOrderCreated: {
          action: 'send',
          channel: { $ref: '#/channels/orders' },
          messages: [{ $ref: '#/channels/orders/messages/OrderCreated' }],
        },
        receiveOrders: {
          action: 'receive',
          channel: { $ref: '#/channels/orders' },
        },
      },
      components: {
        messages: {
          OrderCreated: { name: 'OrderCreated.v1' },
          OrderCancelled: { name: 'OrderCancelled.v1' },
        },
      },
    });

    expect(specification.listEvents()).toEqual([
      { name: 'OrderCreated.v1', direction: 'published' },
      { name: 'OrderCreated.v1', direction: 'consumed' },
      { name: 'OrderCancelled.v1', direction: 'consumed' },
    ]);
  });
});
