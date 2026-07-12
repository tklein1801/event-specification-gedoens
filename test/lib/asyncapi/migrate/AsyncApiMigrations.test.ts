import { describe, expect, it } from 'vitest';
import { InvalidAsyncApiSpecification } from '../../../../src/lib/error/InvalidAsyncApiSpecification';
import { ToStructuredAsyncApiMigration } from '../../../../src/lib/asyncapi/migrate/ToStructuredAsyncApiMigration';
import { ToUnstructuredAsyncApiMigration } from '../../../../src/lib/asyncapi/migrate/ToUnstructuredAsyncApiMigration';

describe('AsyncAPI migrations', () => {
  it('migrates AsyncAPI 2 channels, operations and messages to AsyncAPI 3 structured mode', () => {
    const migrated = new ToStructuredAsyncApiMigration().migrate({
      asyncapi: '2.6.0',
      info: { title: 'Order Events', version: '1.0.0' },
      channels: {
        'orders/created': {
          description: 'Order events',
          subscribe: {
            operationId: 'publishOrderCreated',
            summary: 'Publishes an order',
            message: { $ref: '#/components/messages/OrderCreated' },
          },
          publish: {
            operationId: 'consumeOrderEvents',
            message: {
              oneOf: [
                { $ref: '#/components/messages/OrderCreated' },
                { name: 'InlineOrderChanged', payload: { type: 'object' } },
              ],
            },
          },
        },
      },
      components: {
        messages: {
          OrderCreated: {
            headers: {
              type: 'object',
              required: ['id', 'source', 'type', 'specversion'],
              properties: {
                specversion: { type: 'string', const: '1.0' },
                id: { type: 'string' },
                source: { type: 'string' },
                type: { type: 'string', const: 'order.created' },
              },
            },
            payload: { $ref: '#/components/schemas/Order' },
            traits: [{ $ref: '#/components/messageTraits/CloudEventContext' }],
          },
        },
        messageTraits: {
          CloudEventContext: {
            headers: {
              type: 'object',
              properties: { subject: { type: 'string' } },
            },
          },
        },
        schemas: { Order: { type: 'object' } },
      },
    });

    expect(migrated.asyncapi).toBe('3.0.0');
    expect(migrated.channels).toEqual({
      'orders/created': {
        address: 'orders/created',
        description: 'Order events',
        messages: {
          OrderCreated: { $ref: '#/components/messages/OrderCreated' },
          InlineOrderChanged: {
            name: 'InlineOrderChanged',
            contentType: 'application/cloudevents+json',
            payload: {
              type: 'object',
              required: ['specversion', 'id', 'source', 'type', 'data'],
              properties: {
                specversion: { type: 'string', const: '1.0' },
                id: { type: 'string' },
                source: { type: 'string', format: 'uri-reference' },
                type: { type: 'string' },
                time: { type: 'string', format: 'date-time' },
                datacontenttype: { type: 'string', const: 'application/json' },
                data: { type: 'object' },
              },
            },
          },
        },
      },
    });
    expect(migrated.operations).toEqual({
      publishOrderCreated: {
        action: 'send',
        summary: 'Publishes an order',
        channel: { $ref: '#/channels/orders~1created' },
        messages: [{ $ref: '#/channels/orders~1created/messages/OrderCreated' }],
      },
      consumeOrderEvents: {
        action: 'receive',
        channel: { $ref: '#/channels/orders~1created' },
        messages: [
          { $ref: '#/channels/orders~1created/messages/OrderCreated' },
          { $ref: '#/channels/orders~1created/messages/InlineOrderChanged' },
        ],
      },
    });
    expect(migrated.components).toMatchObject({
      messages: {
        OrderCreated: {
          contentType: 'application/cloudevents+json',
          payload: {
            properties: { data: { $ref: '#/components/schemas/Order' } },
          },
        },
      },
      schemas: { Order: { type: 'object' } },
    });
    expect(migrated.components).not.toHaveProperty('messageTraits');
  });

  it('generates stable unique operation and message identifiers when names are absent', () => {
    const migrated = new ToStructuredAsyncApiMigration().migrate({
      asyncapi: '2.0.0',
      channels: {
        'orders/created': {
          subscribe: { message: { payload: { type: 'object' } } },
          publish: { message: { payload: { type: 'string' } } },
        },
      },
    });

    expect(Object.keys(migrated.operations ?? {})).toEqual([
      'send_orders_created',
      'receive_orders_created',
    ]);
    expect(
      Object.keys((migrated.channels?.['orders/created'] as { messages: object }).messages),
    ).toEqual(['message', 'message_2']);
  });

  it('migrates AsyncAPI 3 operations and structured messages back to AsyncAPI 2', () => {
    const migrated = new ToUnstructuredAsyncApiMigration().migrate({
      asyncapi: '3.0.0',
      channels: {
        orders: {
          address: 'orders/created',
          description: 'Order events',
          messages: {
            OrderCreated: { $ref: '#/components/messages/OrderCreated' },
            OrderChanged: { name: 'OrderChanged', payload: structuredPayload('OrderChanged') },
          },
        },
      },
      operations: {
        sendOrders: {
          action: 'send',
          summary: 'Publishes orders',
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
          OrderCreated: { payload: structuredPayload('OrderCreated') },
        },
      },
    });

    expect(migrated.asyncapi).toBe('2.0.0');
    expect(migrated.operations).toBeUndefined();
    expect(migrated.channels).toEqual({
      'orders/created': {
        description: 'Order events',
        subscribe: {
          operationId: 'sendOrders',
          summary: 'Publishes orders',
          message: { $ref: '#/components/messages/OrderCreated' },
        },
        publish: {
          operationId: 'receiveOrders',
          message: {
            oneOf: [
              { $ref: '#/components/messages/OrderCreated' },
              {
                name: 'OrderChanged',
                contentType: 'application/json',
                headers: unstructuredHeaders(),
                payload: { $ref: '#/components/schemas/OrderChanged' },
              },
            ],
          },
        },
      },
    });
    expect(migrated.components).toMatchObject({
      messages: {
        OrderCreated: {
          headers: unstructuredHeaders(),
          payload: { $ref: '#/components/schemas/OrderCreated' },
        },
      },
    });
  });

  it('rejects documents whose version does not match the requested migration', () => {
    expect(() => new ToStructuredAsyncApiMigration().migrate({ asyncapi: '3.0.0' })).toThrow(
      InvalidAsyncApiSpecification,
    );
    expect(() => new ToUnstructuredAsyncApiMigration().migrate({ asyncapi: '2.6.0' })).toThrow(
      InvalidAsyncApiSpecification,
    );
  });
});

function structuredPayload(schema: string) {
  return {
    type: 'object',
    required: ['specversion', 'id', 'source', 'type', 'data'],
    properties: {
      specversion: { type: 'string', const: '1.0' },
      id: { type: 'string' },
      source: { type: 'string' },
      type: { type: 'string' },
      data: { $ref: `#/components/schemas/${schema}` },
    },
  };
}

function unstructuredHeaders() {
  return {
    type: 'object',
    required: ['specversion', 'id', 'source', 'type'],
    properties: {
      specversion: { type: 'string', const: '1.0' },
      id: { type: 'string' },
      source: { type: 'string' },
      type: { type: 'string' },
    },
  };
}
