import {
  AsyncApiDocumentNavigator,
  migrateAsyncApiText,
  serializeAsyncApi,
  type AsyncApiDocument,
  type MigrationAction,
  type SpecificationFormat,
} from '@event-specification-gedoens/migration-core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { err, ok } from './helpers';
import { z } from 'zod';
import { isDeepStrictEqual } from 'node:util';

export function registerMigrationTools(server: McpServer): void {
  server.registerTool(
    'stringify_json_schema',
    {
      description: 'Stringify a JSON schema',
      inputSchema: {
        content: z.record(z.string(), z.unknown()).describe('The JSON schema to stringify.'),
      },
    },
    async ({ content }) => {
      try {
        const stringifiedContent = JSON.stringify(content, null, 2);

        return ok({ content: stringifiedContent });
      } catch (error) {
        return err(error);
      }
    },
  );

  server.registerTool(
    'migrate_asyncapi',
    {
      description:
        'Migrate an AsyncAPI specification between structured and unstructured CloudEvents.',
      inputSchema: {
        content: z.string().min(1).describe('The AsyncAPI specification as YAML or JSON.'),
        action: z.enum(['to-structured', 'to-unstructured']).describe('The migration direction.'),
        eventName: z
          .string()
          .min(1)
          .optional()
          .describe('Return only the payload schema of this event.'),
        format: z
          .enum(['yaml', 'json'])
          .optional()
          .describe('The output format. Defaults to the input format.'),
      },
    },
    async ({ content, action, format, eventName }) => {
      try {
        const result = migrateAsyncApiText(
          content,
          action as MigrationAction,
          format as SpecificationFormat | undefined,
        );

        return ok({
          content:
            eventName === undefined
              ? result.content
              : serializeAsyncApi(eventSchema(result.document, eventName), result.format),
          format: result.format,
          action,
          asyncapi: result.document.asyncapi,
        });
      } catch (error) {
        return err(error);
      }
    },
  );
}

export function eventSchema(document: AsyncApiDocument, eventName: string): unknown {
  const navigator = new AsyncApiDocumentNavigator(document);
  const isObject = AsyncApiDocumentNavigator.isObject;
  function dereference(value: unknown): unknown {
    const seen = new Set<string>();
    while (isObject(value) && typeof value.$ref === 'string') {
      const ref = value.$ref;
      if (!ref.startsWith('#/') || seen.has(ref))
        throw new Error(`Cannot resolve reference '${ref}'.`);
      seen.add(ref);
      const target = navigator.resolve(value);
      if (target === undefined) throw new Error(`Cannot resolve reference '${ref}'.`);
      const siblings = Object.fromEntries(Object.entries(value).filter(([key]) => key !== '$ref'));
      value = isObject(target) ? { ...target, ...siblings } : target;
    }
    return value;
  }
  const matches: unknown[] = [];
  function visitMessage(value: unknown, fallback?: string): void {
    if (Array.isArray(value)) return value.forEach((item) => visitMessage(item, fallback));
    if (!isObject(value)) return;
    const reference = typeof value.$ref === 'string' ? value.$ref : undefined;
    const message = reference ? dereference(value) : value;
    if (!isObject(message)) return;
    if (message.oneOf !== undefined) return visitMessage(message.oneOf, fallback);
    const name =
      typeof message.name === 'string'
        ? message.name
        : reference
          ? AsyncApiDocumentNavigator.referenceName(reference)
          : fallback;
    if (name === eventName && message.payload !== undefined)
      matches.push(navigator.resolveSchemaReferences(message.payload));
  }

  for (const [channelName, value] of Object.entries(document.channels ?? {})) {
    const channel = dereference(value);
    if (!isObject(channel)) continue;
    if (document.asyncapi.startsWith('3.')) {
      if (isObject(channel.messages)) {
        for (const [name, message] of Object.entries(channel.messages)) visitMessage(message, name);
      }
    } else {
      for (const direction of ['publish', 'subscribe']) {
        const operation = dereference(channel[direction]);
        if (isObject(operation)) visitMessage(operation.message, channelName);
      }
    }
  }
  if (matches.length === 0)
    throw new Error(`Event '${eventName}' was not found or has no payload schema.`);
  if (matches.some((schema) => !isDeepStrictEqual(schema, matches[0]))) {
    throw new Error(`Event '${eventName}' has multiple different payload schemas.`);
  }
  return matches[0];
}
