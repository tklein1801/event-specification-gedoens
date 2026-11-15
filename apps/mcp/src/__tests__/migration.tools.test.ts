import { describe, expect, it } from 'vitest';
import { eventSchema, registerMigrationTools } from '../tools/migration.tools';

type ToolHandler = (input: Record<string, unknown>) => Promise<{
  isError?: boolean;
  content: Array<{ type: string; text: string }>;
}>;

function registeredHandlers(): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();
  const server = {
    registerTool(name: string, _config: unknown, handler: ToolHandler): void {
      handlers.set(name, handler);
    },
  };

  registerMigrationTools(server as never);
  return handlers;
}

describe('migrate_asyncapi MCP tool', () => {
  it('migrates YAML to structured AsyncAPI and returns formatted output', async () => {
    const handler = registeredHandlers().get('migrate_asyncapi');
    expect(handler).toBeDefined();

    const result = await handler!({
      content: 'asyncapi: 2.6.0\ninfo:\n  title: Orders\n  version: 1.0.0\n',
      action: 'to-structured',
    });

    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0].text);
    expect(response.format).toBe('yaml');
    expect(response.asyncapi).toBe('3.0.0');
    expect(response.content).toContain('asyncapi: 3.0.0');
  });

  it('migrates JSON to unstructured AsyncAPI as JSON', async () => {
    const handler = registeredHandlers().get('migrate_asyncapi');
    expect(handler).toBeDefined();

    const result = await handler!({
      content: '{"asyncapi":"3.0.0","info":{"title":"Orders","version":"1.0.0"}}',
      action: 'to-unstructured',
      format: 'json',
    });

    const response = JSON.parse(result.content[0].text);
    expect(response.format).toBe('json');
    expect(response.asyncapi).toBe('2.0.0');
    expect(JSON.parse(response.content).asyncapi).toBe('2.0.0');
  });

  it('returns an MCP error for an invalid migration input', async () => {
    const handler = registeredHandlers().get('migrate_asyncapi');
    expect(handler).toBeDefined();

    const result = await handler!({
      content: 'asyncapi: 3.0.0\n',
      action: 'to-structured',
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error:');
  });

  it('returns only the selected migrated event payload and errors for unknown events', async () => {
    const handler = registeredHandlers().get('migrate_asyncapi')!;
    const content = JSON.stringify({
      asyncapi: '2.6.0',
      info: { title: 'Orders', version: '1.0.0' },
      channels: {
        orders: {
          subscribe: {
            message: {
              oneOf: [
                {
                  name: 'OrderCreated',
                  payload: { type: 'object', properties: { orderId: { type: 'string' } } },
                },
                {
                  name: 'OrderCancelled',
                  payload: { type: 'object', properties: { reason: { type: 'string' } } },
                },
              ],
            },
          },
        },
      },
    });
    const result = await handler({
      content,
      action: 'to-structured',
      eventName: 'OrderCreated',
      format: 'json',
    });
    expect(result.isError).toBeUndefined();
    const schema = JSON.parse(JSON.parse(result.content[0].text).content);
    expect(JSON.stringify(schema)).toContain('orderId');
    expect(JSON.stringify(schema)).not.toContain('reason');
    const full = await handler({ content, action: 'to-structured', format: 'json' });
    const fullDocument = JSON.parse(JSON.parse(full.content[0].text).content);
    expect(fullDocument.asyncapi).toBe('3.0.0');
    expect(JSON.stringify(fullDocument)).toContain('OrderCancelled');
    const unstructured = await handler({
      content: JSON.parse(full.content[0].text).content,
      action: 'to-unstructured',
      eventName: 'OrderCreated',
      format: 'json',
    });
    expect(unstructured.isError).toBeUndefined();
    const unstructuredSchema = JSON.parse(JSON.parse(unstructured.content[0].text).content);
    expect(JSON.stringify(unstructuredSchema)).toContain('orderId');
    expect(JSON.stringify(unstructuredSchema)).not.toContain('reason');
    const missing = await handler({ content, action: 'to-structured', eventName: 'Missing' });
    expect(missing.isError).toBe(true);
    expect(missing.content[0].text).toContain('Missing');
  });

  it('resolves nested payload references in unstructured output', () => {
    const document = {
      asyncapi: '2.0.0',
      channels: {
        orders: {
          subscribe: {
            message: { name: 'Order', payload: { $ref: '#/components/schemas/Order' } },
          },
        },
      },
      components: {
        schemas: {
          Order: { properties: { item: { $ref: '#/components/schemas/Item' } } },
          Item: { type: 'string' },
        },
      },
    };
    expect(eventSchema(document, 'Order')).toEqual({ properties: { item: { type: 'string' } } });
  });

  it('preserves reference-shaped example data when selecting an unstructured event', async () => {
    const handler = registeredHandlers().get('migrate_asyncapi')!;
    const examples = [{ $ref: 'https://example.org/item' }];
    const content = JSON.stringify({
      asyncapi: '3.0.0',
      info: { title: 'Orders', version: '1.0.0' },
      channels: {
        orders: {
          address: 'orders',
          messages: {
            Order: {
              name: 'Order',
              payload: { type: 'object', properties: { data: { type: 'object', examples } } },
            },
          },
        },
      },
      operations: { send: { action: 'send', channel: { $ref: '#/channels/orders' } } },
    });
    const result = await handler({
      content,
      action: 'to-unstructured',
      eventName: 'Order',
      format: 'json',
    });
    expect(result.isError).toBeUndefined();
    expect(JSON.parse(JSON.parse(result.content[0].text).content).examples).toEqual(examples);
  });

  it('preserves reference-shaped example data when selecting a structured event', async () => {
    const handler = registeredHandlers().get('migrate_asyncapi')!;
    const examples = [{ $ref: 'https://example.org/item' }];
    const content = JSON.stringify({
      asyncapi: '2.6.0',
      info: { title: 'Orders', version: '1.0.0' },
      channels: {
        orders: {
          subscribe: {
            message: { name: 'Order', payload: { type: 'object', examples } },
          },
        },
      },
    });
    const result = await handler({
      content,
      action: 'to-structured',
      eventName: 'Order',
      format: 'json',
    });
    expect(result.isError).toBeUndefined();
    expect(JSON.parse(JSON.parse(result.content[0].text).content).properties.data.examples).toEqual(
      examples,
    );
  });

  it('accepts identical event schemas with properties in a different order', () => {
    const first = {
      type: 'object',
      properties: { id: { type: 'string' }, count: { type: 'integer' } },
    };
    const second = {
      type: 'object',
      properties: { count: { type: 'integer' }, id: { type: 'string' } },
    };
    const document = {
      asyncapi: '2.0.0',
      channels: {
        a: { subscribe: { message: { name: 'Order', payload: first } } },
        b: { subscribe: { message: { name: 'Order', payload: second } } },
      },
    };
    expect(eventSchema(document, 'Order')).toEqual(first);
  });

  it('rejects different schemas for the same event name', () => {
    const document = {
      asyncapi: '2.0.0',
      channels: {
        a: { subscribe: { message: { name: 'Order', payload: { type: 'string' } } } },
        b: { subscribe: { message: { name: 'Order', payload: { type: 'number' } } } },
      },
    };
    expect(() => eventSchema(document, 'Order')).toThrow('multiple different payload schemas');
  });
});
