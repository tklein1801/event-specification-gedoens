import { describe, expect, it } from 'vitest';
import { InvalidAsyncApiSpecification } from '../../../../src/lib/error/InvalidAsyncApiSpecification';
import { AsyncApiDocumentNavigator } from '../../../../src/lib/asyncapi/migrate/AsyncApiDocumentNavigator';
import { CloudEventMessageMigrator } from '../../../../src/lib/asyncapi/migrate/CloudEventMessageMigrator';

describe('CloudEventMessageMigrator', () => {
  it('moves CloudEvent headers, traits and business payload into a structured envelope', () => {
    const document = {
      asyncapi: '2.0.0',
      components: {
        messageTraits: {
          CloudEventContext: {
            description: 'CloudEvent context',
            headers: {
              type: 'object',
              required: ['id', 'source', 'type', 'specversion'],
              properties: {
                specversion: { type: 'string', const: '1.0' },
                id: { type: 'string' },
                source: { type: 'string', format: 'uri-reference' },
              },
            },
          },
        },
      },
    };
    const migrator = new CloudEventMessageMigrator(new AsyncApiDocumentNavigator(document));

    const migrated = migrator.toStructured({
      name: 'OrderCreated',
      contentType: 'application/json',
      headers: {
        type: 'object',
        required: ['type'],
        properties: { type: { type: 'string', const: 'order.created' } },
      },
      payload: { $ref: '#/components/schemas/OrderCreated' },
      traits: [
        { $ref: '#/components/messageTraits/CloudEventContext' },
        { summary: 'Retained trait' },
      ],
      examples: [
        {
          headers: { id: '42', source: '/orders', type: 'order.created', specversion: '1.0' },
          payload: { orderId: '123' },
        },
      ],
    });

    expect(migrated).toMatchObject({
      name: 'OrderCreated',
      contentType: 'application/cloudevents+json',
      payload: {
        type: 'object',
        required: ['specversion', 'id', 'source', 'type', 'data'],
        properties: {
          specversion: { type: 'string', const: '1.0' },
          id: { type: 'string' },
          source: { type: 'string', format: 'uri-reference' },
          type: { type: 'string', const: 'order.created' },
          datacontenttype: { type: 'string', const: 'application/json' },
          data: { $ref: '#/components/schemas/OrderCreated' },
        },
      },
      traits: [{ description: 'CloudEvent context' }, { summary: 'Retained trait' }],
      examples: [
        {
          payload: {
            id: '42',
            source: '/orders',
            type: 'order.created',
            specversion: '1.0',
            data: { orderId: '123' },
          },
        },
      ],
    });
    expect(migrated).not.toHaveProperty('headers');
  });

  it('moves a structured envelope back to headers and business payload', () => {
    const document = { asyncapi: '3.0.0' };
    const migrator = new CloudEventMessageMigrator(new AsyncApiDocumentNavigator(document));

    const migrated = migrator.toUnstructured({
      contentType: 'application/cloudevents+json',
      payload: {
        type: 'object',
        required: ['specversion', 'id', 'source', 'type', 'data'],
        properties: {
          specversion: { type: 'string', const: '1.0' },
          id: { type: 'string' },
          source: { type: 'string' },
          type: { type: 'string' },
          datacontenttype: { type: 'string', const: 'application/json' },
          data: { $ref: '#/components/schemas/OrderCreated' },
        },
      },
      examples: [
        {
          payload: {
            specversion: '1.0',
            id: '42',
            source: '/orders',
            type: 'order.created',
            data: { orderId: '123' },
          },
        },
      ],
    });

    expect(migrated).toEqual({
      contentType: 'application/json',
      headers: {
        type: 'object',
        required: ['specversion', 'id', 'source', 'type'],
        properties: {
          specversion: { type: 'string', const: '1.0' },
          id: { type: 'string' },
          source: { type: 'string' },
          type: { type: 'string' },
          datacontenttype: { type: 'string', const: 'application/json' },
        },
      },
      payload: { $ref: '#/components/schemas/OrderCreated' },
      examples: [
        {
          headers: { specversion: '1.0', id: '42', source: '/orders', type: 'order.created' },
          payload: { orderId: '123' },
        },
      ],
    });
  });

  it('rejects structured messages without a data property', () => {
    const document = { asyncapi: '3.0.0' };
    const migrator = new CloudEventMessageMigrator(new AsyncApiDocumentNavigator(document));

    expect(() =>
      migrator.toUnstructured({
        payload: { type: 'object', properties: { id: { type: 'string' } } },
      }),
    ).toThrow(InvalidAsyncApiSpecification);
  });
});
