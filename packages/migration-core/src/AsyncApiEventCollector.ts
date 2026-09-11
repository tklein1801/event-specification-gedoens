import type { AsyncApiDocument } from './AsyncApiSpecification';
import { AsyncApiDocumentNavigator } from './migrate/AsyncApiDocumentNavigator';

export type EventDirection = 'published' | 'consumed';

export interface AsyncApiEvent {
  name: string;
  direction: EventDirection;
}

export class AsyncApiEventCollector {
  private readonly navigator: AsyncApiDocumentNavigator;

  constructor(private readonly document: AsyncApiDocument) {
    this.navigator = new AsyncApiDocumentNavigator(document);
  }

  collect(): AsyncApiEvent[] {
    const events = this.document.asyncapi.startsWith('2.')
      ? this.collectVersion2Events()
      : this.collectVersion3Events();

    const seen = new Set<string>();
    return events.filter((event) => {
      const key = `${event.name}\u0000${event.direction}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private collectVersion2Events(): AsyncApiEvent[] {
    return Object.entries(this.document.channels ?? {}).flatMap(([channelName, value]) => {
      const channel = this.navigator.resolveObject(value);
      if (channel === undefined) return [];

      return [
        ...this.collectVersion2Operation(channel.subscribe, 'published', channelName),
        ...this.collectVersion2Operation(channel.publish, 'consumed', channelName),
      ];
    });
  }

  private collectVersion2Operation(
    value: unknown,
    direction: EventDirection,
    channelName: string,
  ): AsyncApiEvent[] {
    const operation = this.navigator.resolveObject(value);
    if (operation === undefined) return [];

    return this.collectMessageNames(operation.message, channelName).map((name) => ({
      name,
      direction,
    }));
  }

  private collectVersion3Events(): AsyncApiEvent[] {
    return Object.values(this.document.operations ?? {}).flatMap((value) => {
      const operation = this.navigator.resolveObject(value);
      if (
        operation === undefined ||
        (operation.action !== 'send' && operation.action !== 'receive')
      ) {
        return [];
      }

      const direction: EventDirection = operation.action === 'send' ? 'published' : 'consumed';
      const names = Array.isArray(operation.messages)
        ? operation.messages.flatMap((message) => this.collectMessageNames(message))
        : this.collectChannelMessageNames(operation.channel);

      return names.map((name) => ({ name, direction }));
    });
  }

  private collectChannelMessageNames(value: unknown): string[] {
    const channel = this.navigator.resolveObject(value);
    if (channel === undefined || !AsyncApiDocumentNavigator.isObject(channel.messages)) return [];

    return Object.entries(channel.messages).flatMap(([name, message]) =>
      this.collectMessageNames(message, name),
    );
  }

  private collectMessageNames(
    value: unknown,
    fallback?: string,
    visited = new Set<string>(),
  ): string[] {
    if (Array.isArray(value)) {
      return value.flatMap((message) => this.collectMessageNames(message, fallback, visited));
    }

    if (!AsyncApiDocumentNavigator.isObject(value)) {
      return fallback === undefined ? [] : [fallback];
    }

    if (typeof value.$ref === 'string') {
      if (visited.has(value.$ref)) return fallback === undefined ? [] : [fallback];

      const nextVisited = new Set(visited).add(value.$ref);
      const referenced = this.navigator.resolveReference(value.$ref);
      const referenceName = AsyncApiDocumentNavigator.referenceName(value.$ref);
      return this.collectMessageNames(referenced, referenceName ?? fallback, nextVisited);
    }

    if (typeof value.name === 'string') return [value.name];

    if (AsyncApiDocumentNavigator.isObject(value.oneOf) || Array.isArray(value.oneOf)) {
      return this.collectMessageNames(value.oneOf, fallback, visited);
    }

    return fallback === undefined ? [] : [fallback];
  }
}
