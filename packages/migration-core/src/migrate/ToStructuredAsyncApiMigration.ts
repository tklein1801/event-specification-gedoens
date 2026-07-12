import { InvalidAsyncApiSpecification } from '../InvalidAsyncApiSpecification';
import type { AsyncApiDocument } from '../AsyncApiSpecification';
import type { AsyncApiMigration } from './AsyncApiMigration';
import { AsyncApiDocumentNavigator, type JsonObject } from './AsyncApiDocumentNavigator';
import { CloudEventMessageMigrator } from './CloudEventMessageMigrator';
import { CloudEventSchemaMigrator } from './CloudEventSchemaMigrator';
import { MigrationIdentifierRegistry } from './MigrationIdentifierRegistry';

type Action = 'send' | 'receive';

interface ChannelMigration {
  channel: JsonObject;
  operations: Record<string, JsonObject>;
}

export class ToStructuredAsyncApiMigration implements AsyncApiMigration {
  readonly action = 'to-structured';

  migrate(document: AsyncApiDocument): AsyncApiDocument {
    this.assertVersion(document);

    const navigator = new AsyncApiDocumentNavigator(document);
    const messageMigrator = new CloudEventMessageMigrator(navigator);
    const schemaMigrator = new CloudEventSchemaMigrator(document, navigator, messageMigrator);
    const operationIdentifiers = new MigrationIdentifierRegistry();
    const channels: Record<string, JsonObject> = {};
    const operations: Record<string, JsonObject> = {};

    for (const [channelName, channelValue] of Object.entries(document.channels ?? {})) {
      const channel = navigator.resolveObject(channelValue);
      if (channel === undefined) {
        throw new InvalidAsyncApiSpecification(`Channel '${channelName}' must be an object.`);
      }

      const migrated = this.migrateChannel(
        channelName,
        channel,
        schemaMigrator,
        operationIdentifiers,
      );
      channels[channelName] = migrated.channel;
      Object.assign(operations, migrated.operations);
    }

    const components = document.components;
    const documentFields = AsyncApiDocumentNavigator.omit(document, [
      'channels',
      'operations',
      'components',
    ]);
    const migratedComponents = schemaMigrator.withSchemas(
      this.migrateComponents(components, schemaMigrator),
    );

    return {
      ...structuredClone(documentFields),
      asyncapi: '3.0.0',
      ...(Object.keys(channels).length > 0 ? { channels } : {}),
      ...(Object.keys(operations).length > 0 ? { operations } : {}),
      ...(migratedComponents === undefined ? {} : { components: migratedComponents }),
    };
  }

  private migrateChannel(
    channelName: string,
    channel: JsonObject,
    schemaMigrator: CloudEventSchemaMigrator,
    operationIdentifiers: MigrationIdentifierRegistry,
  ): ChannelMigration {
    const { subscribe, publish, ...channelFields } = channel;
    const channelMessages: Record<string, unknown> = {};
    const operations: Record<string, JsonObject> = {};
    const messageIdentifiers = new MigrationIdentifierRegistry();
    const references = new Map<string, string>();

    this.addOperation(
      'send',
      channelName,
      subscribe,
      channelMessages,
      operations,
      schemaMigrator,
      messageIdentifiers,
      operationIdentifiers,
      references,
    );
    this.addOperation(
      'receive',
      channelName,
      publish,
      channelMessages,
      operations,
      schemaMigrator,
      messageIdentifiers,
      operationIdentifiers,
      references,
    );

    return {
      channel: {
        address: channelName,
        ...structuredClone(channelFields),
        ...(Object.keys(channelMessages).length > 0 ? { messages: channelMessages } : {}),
      },
      operations,
    };
  }

  private addOperation(
    action: Action,
    channelName: string,
    operationValue: unknown,
    channelMessages: Record<string, unknown>,
    operations: Record<string, JsonObject>,
    schemaMigrator: CloudEventSchemaMigrator,
    messageIdentifiers: MigrationIdentifierRegistry,
    operationIdentifiers: MigrationIdentifierRegistry,
    references: Map<string, string>,
  ): void {
    if (operationValue === undefined) return;
    if (!AsyncApiDocumentNavigator.isObject(operationValue)) {
      throw new InvalidAsyncApiSpecification(
        `The ${action === 'send' ? 'subscribe' : 'publish'} operation of channel '${channelName}' must be an object.`,
      );
    }

    const { message, operationId, ...operationFields } = operationValue;
    const messageValues = this.messageValues(message);
    const messageReferences = messageValues.map((messageValue) => {
      const messageName = this.addChannelMessage(
        messageValue,
        channelMessages,
        schemaMigrator,
        messageIdentifiers,
        references,
      );
      return {
        $ref: AsyncApiDocumentNavigator.pointer('channels', channelName, 'messages', messageName),
      };
    });
    const identifier = operationIdentifiers.use(
      typeof operationId === 'string' ? operationId : undefined,
      `${action}_${channelName}`,
    );

    operations[identifier] = {
      ...structuredClone(operationFields),
      action,
      channel: { $ref: AsyncApiDocumentNavigator.pointer('channels', channelName) },
      ...(messageReferences.length > 0 ? { messages: messageReferences } : {}),
    };
  }

  private addChannelMessage(
    message: unknown,
    channelMessages: Record<string, unknown>,
    schemaMigrator: CloudEventSchemaMigrator,
    messageIdentifiers: MigrationIdentifierRegistry,
    references: Map<string, string>,
  ): string {
    if (!AsyncApiDocumentNavigator.isObject(message)) {
      throw new InvalidAsyncApiSpecification('An operation message must be an object.');
    }

    if (typeof message.$ref === 'string') {
      const existing = references.get(message.$ref);
      if (existing !== undefined) return existing;

      const messageName = messageIdentifiers.use(
        AsyncApiDocumentNavigator.referenceName(message.$ref),
        'message',
      );
      references.set(message.$ref, messageName);
      channelMessages[messageName] = structuredClone(message);
      return messageName;
    }

    const preferredName =
      typeof message.name === 'string'
        ? message.name
        : typeof message.messageId === 'string'
          ? message.messageId
          : undefined;
    const messageName = messageIdentifiers.use(preferredName, 'message');
    channelMessages[messageName] = schemaMigrator.toStructured(message, messageName);
    return messageName;
  }

  private messageValues(message: unknown): unknown[] {
    if (message === undefined) return [];
    if (AsyncApiDocumentNavigator.isObject(message) && Array.isArray(message.oneOf)) {
      return message.oneOf;
    }

    return [message];
  }

  private migrateComponents(
    components: AsyncApiDocument['components'],
    schemaMigrator: CloudEventSchemaMigrator,
  ): JsonObject | undefined {
    if (components === undefined) return undefined;

    const cloned = structuredClone(components) as JsonObject;
    if (components.messages === undefined) return cloned;
    if (!AsyncApiDocumentNavigator.isObject(components.messages)) {
      throw new InvalidAsyncApiSpecification('The components.messages value must be an object.');
    }

    cloned.messages = Object.fromEntries(
      Object.entries(components.messages).map(([name, message]) => {
        if (!AsyncApiDocumentNavigator.isObject(message)) {
          throw new InvalidAsyncApiSpecification(`Message component '${name}' must be an object.`);
        }

        return [
          name,
          typeof message.$ref === 'string'
            ? structuredClone(message)
            : schemaMigrator.toStructured(message, name),
        ];
      }),
    );
    this.removeMigratedHeaderTraits(cloned);
    return cloned;
  }

  private removeMigratedHeaderTraits(components: JsonObject): void {
    if (!AsyncApiDocumentNavigator.isObject(components.messageTraits)) return;

    const messageTraits = Object.fromEntries(
      Object.entries(components.messageTraits).filter(([, trait]) => {
        return !(AsyncApiDocumentNavigator.isObject(trait) && trait.headers !== undefined);
      }),
    );

    if (Object.keys(messageTraits).length === 0) {
      delete components.messageTraits;
      return;
    }
    components.messageTraits = messageTraits;
  }

  private assertVersion(document: AsyncApiDocument): void {
    if (!document.asyncapi.startsWith('2.')) {
      throw new InvalidAsyncApiSpecification(
        `Migration '${this.action}' requires an AsyncAPI 2.x document.`,
      );
    }
  }
}
