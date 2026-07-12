import { InvalidAsyncApiSpecification } from '../InvalidAsyncApiSpecification';
import type { AsyncApiDocument } from '../AsyncApiSpecification';
import type { AsyncApiMigration } from './AsyncApiMigration';
import { AsyncApiDocumentNavigator, type JsonObject } from './AsyncApiDocumentNavigator';
import { CloudEventMessageMigrator } from './CloudEventMessageMigrator';

type LegacyOperation = 'subscribe' | 'publish';

interface ChannelContext {
  address: string;
  messages: Record<string, unknown>;
}

export class ToUnstructuredAsyncApiMigration implements AsyncApiMigration {
  readonly action = 'to-unstructured';

  migrate(document: AsyncApiDocument): AsyncApiDocument {
    this.assertVersion(document);

    const navigator = new AsyncApiDocumentNavigator(document);
    const messageMigrator = new CloudEventMessageMigrator(navigator);
    const channels: Record<string, JsonObject> = {};
    const channelContexts = new Map<string, ChannelContext>();

    for (const [channelName, channelValue] of Object.entries(document.channels ?? {})) {
      const channel = navigator.resolveObject(channelValue);
      if (channel === undefined) {
        throw new InvalidAsyncApiSpecification(`Channel '${channelName}' must be an object.`);
      }

      const { address, messages, ...channelFields } = channel;
      const outputAddress = typeof address === 'string' ? address : channelName;
      if (channels[outputAddress] !== undefined) {
        throw new InvalidAsyncApiSpecification(
          `Multiple channels resolve to the address '${outputAddress}'.`,
        );
      }

      const channelMessages =
        messages === undefined
          ? {}
          : this.requireObject(messages, `Channel '${channelName}' messages`);
      channels[outputAddress] = structuredClone(channelFields);
      channelContexts.set(channelName, { address: outputAddress, messages: channelMessages });
    }

    for (const [operationName, operationValue] of Object.entries(document.operations ?? {})) {
      const operation = navigator.resolveObject(operationValue);
      if (operation === undefined) {
        throw new InvalidAsyncApiSpecification(`Operation '${operationName}' must be an object.`);
      }

      this.addOperation(
        operationName,
        operation,
        channels,
        channelContexts,
        navigator,
        messageMigrator,
      );
    }

    const components = document.components;
    const documentFields = AsyncApiDocumentNavigator.omit(document, [
      'channels',
      'operations',
      'components',
    ]);
    const migratedComponents = this.migrateComponents(components, messageMigrator);

    return {
      ...structuredClone(documentFields),
      asyncapi: '2.0.0',
      ...(Object.keys(channels).length > 0 ? { channels } : {}),
      ...(migratedComponents === undefined ? {} : { components: migratedComponents }),
    };
  }

  private addOperation(
    operationName: string,
    operation: JsonObject,
    channels: Record<string, JsonObject>,
    channelContexts: Map<string, ChannelContext>,
    navigator: AsyncApiDocumentNavigator,
    messageMigrator: CloudEventMessageMigrator,
  ): void {
    const legacyOperation = this.legacyOperation(operation.action, operationName);
    const channelName = this.channelName(operation.channel);
    const context = channelContexts.get(channelName);
    if (context === undefined) {
      throw new InvalidAsyncApiSpecification(
        `Operation '${operationName}' references unknown channel '${channelName}'.`,
      );
    }

    const channel = channels[context.address];
    if (channel === undefined) {
      throw new InvalidAsyncApiSpecification(
        `Operation '${operationName}' references unavailable channel '${context.address}'.`,
      );
    }
    if (channel[legacyOperation] !== undefined) {
      throw new InvalidAsyncApiSpecification(
        `Channel '${context.address}' defines multiple '${legacyOperation}' operations.`,
      );
    }

    const operationMessages = operation.messages;
    const operationFields = AsyncApiDocumentNavigator.omit(operation, [
      'action',
      'channel',
      'messages',
    ]);
    const selectedMessages = Array.isArray(operationMessages)
      ? operationMessages
      : Object.values(context.messages);
    const messages = selectedMessages.map((message) =>
      this.toLegacyMessage(message, navigator, messageMigrator),
    );

    channel[legacyOperation] = {
      ...structuredClone(operationFields),
      operationId: operationName,
      ...(messages.length === 1
        ? { message: messages[0] }
        : messages.length > 1
          ? { message: { oneOf: messages } }
          : {}),
    };
  }

  private toLegacyMessage(
    message: unknown,
    navigator: AsyncApiDocumentNavigator,
    messageMigrator: CloudEventMessageMigrator,
  ): JsonObject {
    if (!AsyncApiDocumentNavigator.isObject(message)) {
      throw new InvalidAsyncApiSpecification('An operation message must be an object.');
    }

    if (typeof message.$ref === 'string') {
      if (message.$ref.startsWith('#/components/messages/')) {
        return structuredClone(message);
      }

      const resolved = navigator.resolveObject(message);
      if (resolved === undefined) {
        throw new InvalidAsyncApiSpecification(
          `Message reference '${message.$ref}' cannot be resolved.`,
        );
      }
      if (typeof resolved.$ref === 'string' && resolved.$ref.startsWith('#/components/messages/')) {
        return structuredClone(resolved);
      }

      return messageMigrator.toUnstructured(resolved);
    }

    return messageMigrator.toUnstructured(message);
  }

  private migrateComponents(
    components: AsyncApiDocument['components'],
    messageMigrator: CloudEventMessageMigrator,
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
            : messageMigrator.toUnstructured(message),
        ];
      }),
    );
    return cloned;
  }

  private channelName(channel: unknown): string {
    if (!AsyncApiDocumentNavigator.isObject(channel) || typeof channel.$ref !== 'string') {
      throw new InvalidAsyncApiSpecification(
        'An AsyncAPI 3 operation must reference a top-level channel.',
      );
    }

    const channelName = AsyncApiDocumentNavigator.referenceName(channel.$ref);
    if (channelName === undefined || !channel.$ref.startsWith('#/channels/')) {
      throw new InvalidAsyncApiSpecification(
        `Channel reference '${channel.$ref}' must point to a top-level channel.`,
      );
    }
    return channelName;
  }

  private legacyOperation(action: unknown, operationName: string): LegacyOperation {
    if (action === 'send') return 'subscribe';
    if (action === 'receive') return 'publish';
    throw new InvalidAsyncApiSpecification(
      `Operation '${operationName}' must use action 'send' or 'receive'.`,
    );
  }

  private requireObject(value: unknown, field: string): JsonObject {
    if (!AsyncApiDocumentNavigator.isObject(value)) {
      throw new InvalidAsyncApiSpecification(`${field} must be an object.`);
    }
    return value;
  }

  private assertVersion(document: AsyncApiDocument): void {
    if (!document.asyncapi.startsWith('3.')) {
      throw new InvalidAsyncApiSpecification(
        `Migration '${this.action}' requires an AsyncAPI 3.x document.`,
      );
    }
  }
}
