import { describe, expect, it } from 'vitest';
import { InvalidAsyncApiSpecification } from '../../src/InvalidAsyncApiSpecification';
import { ToStructuredAsyncApiMigration } from '../../src/migrate/ToStructuredAsyncApiMigration';
import { ToUnstructuredAsyncApiMigration } from '../../src/migrate/ToUnstructuredAsyncApiMigration';

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
            payload: { $ref: '#/components/schemas/InlineOrderChanged' },
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
          payload: { $ref: '#/components/schemas/Order' },
        },
      },
      schemas: {
        Order: {
          properties: {
            type: { const: 'order.created' },
            data: { type: 'object' },
          },
        },
        InlineOrderChanged: {
          properties: { data: { type: 'object' } },
        },
      },
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
                headers: retainedTypeHeader(),
                payload: { $ref: '#/components/schemas/OrderChanged' },
                traits: [{ $ref: '#/components/messageTraits/CloudEventContext' }],
              },
            ],
          },
        },
      },
    });
    expect(migrated.components).toMatchObject({
      messages: {
        OrderCreated: {
          headers: retainedTypeHeader(),
          payload: { $ref: '#/components/schemas/OrderCreated' },
          traits: [{ $ref: '#/components/messageTraits/CloudEventContext' }],
        },
      },
      messageTraits: {
        CloudEventContext: {
          headers: unstructuredHeaders(),
        },
      },
    });
  });

  it('resolves referenced business schemas into structured schema components', () => {
    const migrated = new ToStructuredAsyncApiMigration().migrate({
      asyncapi: '2.6.0',
      components: {
        messages: {
          OrderCreated: {
            headers: { properties: { type: { const: 'order.created' } } },
            payload: { $ref: '#/components/schemas/Order' },
          },
        },
        schemas: {
          Order: {
            type: 'object',
            properties: { customer: { $ref: '#/components/schemas/Customer' } },
          },
          Customer: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              address: { $ref: '#/components/schemas/Address' },
            },
          },
          Address: { type: 'object', properties: { city: { type: 'string' } } },
        },
      },
    });

    expect(migrated.components?.messages).toMatchObject({
      OrderCreated: { payload: { $ref: '#/components/schemas/Order' } },
    });
    expect(migrated.components?.schemas).toMatchObject({
      Order: {
        properties: {
          type: { const: 'order.created' },
          data: {
            type: 'object',
            properties: {
              customer: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  address: {
                    type: 'object',
                    properties: { city: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
    });
    expect(JSON.stringify(migrated.components?.schemas)).not.toContain('$ref');
    expect(Object.keys(migrated.components?.schemas ?? {})).toEqual(['Order']);
  });

  it('rejects circular business schema references instead of retaining a reference', () => {
    expect(() =>
      new ToStructuredAsyncApiMigration().migrate({
        asyncapi: '2.6.0',
        components: {
          messages: {
            TreeChanged: {
              payload: { $ref: '#/components/schemas/TreeNode' },
            },
          },
          schemas: {
            TreeNode: {
              type: 'object',
              properties: { child: { $ref: '#/components/schemas/TreeNode' } },
            },
          },
        },
      }),
    ).toThrow(
      "Circular schema reference '#/components/schemas/TreeNode' cannot be fully resolved.",
    );
  });

  it('removes the schemas component when none of its schemas are referenced', () => {
    const migrated = new ToStructuredAsyncApiMigration().migrate({
      asyncapi: '2.6.0',
      components: {
        schemas: {
          Unused: { type: 'object' },
        },
      },
    });

    expect(migrated.components).toBeUndefined();
  });

  it('removes CloudEvent fields from referenced schemas in unstructured mode', () => {
    const migrated = new ToUnstructuredAsyncApiMigration().migrate({
      asyncapi: '3.0.0',
      components: {
        messages: {
          OrderCreated: { payload: { $ref: '#/components/schemas/OrderCreated' } },
        },
        schemas: {
          OrderCreated: {
            type: 'object',
            required: ['specversion', 'id', 'source', 'type', 'data'],
            properties: {
              specversion: { type: 'string', const: '1.0' },
              id: { type: 'string' },
              source: { type: 'string' },
              type: { type: 'string', const: 'order.created' },
              data: {
                type: 'object',
                properties: { orderId: { type: 'string' } },
              },
            },
          },
        },
      },
    });

    expect(migrated.components?.messages).toMatchObject({
      OrderCreated: {
        payload: { $ref: '#/components/schemas/OrderCreated' },
        traits: [{ $ref: '#/components/messageTraits/CloudEventContext' }],
      },
    });
    expect(migrated.components?.messages?.OrderCreated).toMatchObject({
      headers: { properties: { type: { const: 'order.created' } } },
    });
    expect(migrated.components?.messageTraits).toMatchObject({
      CloudEventContext: {
        headers: {
          required: ['specversion', 'id', 'source', 'type'],
          properties: {
            specversion: { const: '1.0' },
            id: { type: 'string' },
            source: { type: 'string' },
            type: { const: 'order.created' },
          },
        },
      },
    });
    expect(migrated.components?.schemas).toEqual({
      OrderCreated: {
        type: 'object',
        properties: { orderId: { type: 'string' } },
      },
    });
  });

  it('recreates a shared CloudEvent message trait for multiple messages', () => {
    const migrated = new ToUnstructuredAsyncApiMigration().migrate({
      asyncapi: '3.0.0',
      components: {
        messages: {
          Created: { payload: { $ref: '#/components/schemas/Created' } },
          Changed: { payload: { $ref: '#/components/schemas/Changed' } },
        },
        schemas: {
          Created: structuredPayloadWithType('order.created'),
          Changed: structuredPayloadWithType('order.changed'),
        },
      },
    });

    expect(migrated.components?.messages).toMatchObject({
      Created: { traits: [{ $ref: '#/components/messageTraits/CloudEventContext' }] },
      Changed: { traits: [{ $ref: '#/components/messageTraits/CloudEventContext' }] },
    });
    expect(migrated.components?.messageTraits).toMatchObject({
      CloudEventContext: {
        headers: {
          required: ['specversion', 'id', 'source', 'type'],
          properties: {
            specversion: { type: 'string', const: '1.0' },
            id: { type: 'string' },
            source: { type: 'string' },
            type: { type: 'string' },
            subject: { type: 'string' },
          },
        },
      },
    });
  });

  it('applies SAP structured-to-unstructured schema rules', () => {
    const migrated = new ToUnstructuredAsyncApiMigration().migrate({
      asyncapi: '3.0.0',
      info: { title: 'Orders' },
      components: {
        messages: {
          OrderCreated: { payload: { $ref: '#/components/schemas/OrderCreated' } },
        },
        schemas: {
          OrderCreated: {
            type: 'object',
            required: ['specversion', 'id', 'source', 'type', 'data'],
            properties: {
              specversion: { type: 'string', const: '1.0' },
              id: { type: 'string' },
              source: { type: 'string' },
              type: { type: 'string', const: 'orders.created.v1' },
              datacontenttype: { type: 'string', const: 'application/json' },
              data: {
                type: 'object',
                properties: {
                  customer: {
                    type: 'object',
                    properties: { age: { type: 'integer' } },
                  },
                  lines: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: { amount: { type: 'number' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    expect(migrated.info).toMatchObject({
      title: 'Orders',
      description: 'Unstructured CloudEvent event specification.',
    });
    expect(migrated.components?.messages).toMatchObject({
      OrderCreated: {
        name: 'orders.created.v1',
        headers: retainedCloudEventHeaders(),
        traits: [{ $ref: '#/components/messageTraits/CloudEventContext' }],
        payload: { $ref: '#/components/schemas/OrderCreated' },
      },
    });
    expect(migrated.components?.schemas).toEqual({
      OrderCreated: {
        type: 'object',
        properties: {
          customer: { $ref: '#/components/schemas/OrderCreated_customer' },
          lines: {
            type: 'array',
            items: { $ref: '#/components/schemas/OrderCreated_lines' },
          },
        },
      },
      OrderCreated_customer: {
        type: 'object',
        properties: { age: { type: 'integer', format: 'int64' } },
      },
      OrderCreated_lines: {
        type: 'object',
        properties: { amount: { type: 'number', format: 'decimal' } },
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

function retainedTypeHeader() {
  return { properties: { type: { type: 'string' } } };
}

function retainedCloudEventHeaders() {
  return {
    properties: {
      type: { type: 'string' },
      datacontenttype: { type: 'string', const: 'application/json' },
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

function structuredPayloadWithType(type: string) {
  return {
    type: 'object',
    required: ['specversion', 'id', 'source', 'type', 'data'],
    properties: {
      specversion: { type: 'string', const: '1.0' },
      id: { type: 'string' },
      source: { type: 'string' },
      type: { type: 'string', const: type },
      subject: { type: 'string' },
      data: { type: 'object' },
    },
  };
}
