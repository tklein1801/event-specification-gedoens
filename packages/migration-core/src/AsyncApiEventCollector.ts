import type { AsyncApiDocument } from './AsyncApiSpecification';

export type EventDirection = 'published' | 'consumed';

export interface AsyncApiEvent {
  name: string;
  direction: EventDirection;
}

type JsonObject = Record<string, unknown>;

export class AsyncApiEventCollector {
  constructor(private readonly document: AsyncApiDocument) {}

  collect(): AsyncApiEvent[] {
    const events = this.document.asyncapi.startsWith('2.')
      ? this.collectVersion2Events()
      : this.collectVersion3Events();

    return events.filter(
      (event, index) =>
        events.findIndex(
          (candidate) => candidate.name === event.name && candidate.direction === event.direction,
        ) === index,
    );
  }

  private collectVersion2Events(): AsyncApiEvent[] {
    return Object.entries(this.document.channels ?? {}).flatMap(([channelName, value]) => {
      const channel = this.resolveObject(value);
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
    const operation = this.resolveObject(value);
    if (operation === undefined) return [];

    return this.collectMessageNames(operation.message, channelName).map((name) => ({
      name,
      direction,
    }));
  }

  private collectVersion3Events(): AsyncApiEvent[] {
    return Object.values(this.document.operations ?? {}).flatMap((value) => {
      const operation = this.resolveObject(value);
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
    const channel = this.resolveObject(value);
    if (channel === undefined || !AsyncApiEventCollector.isObject(channel.messages)) return [];

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

    if (!AsyncApiEventCollector.isObject(value)) {
      return fallback === undefined ? [] : [fallback];
    }

    if (typeof value.$ref === 'string') {
      if (visited.has(value.$ref)) return fallback === undefined ? [] : [fallback];

      const nextVisited = new Set(visited).add(value.$ref);
      const referenced = this.resolveReference(value.$ref);
      const referenceName = AsyncApiEventCollector.referenceName(value.$ref);
      return this.collectMessageNames(referenced, referenceName ?? fallback, nextVisited);
    }

    if (typeof value.name === 'string') return [value.name];

    if (AsyncApiEventCollector.isObject(value.oneOf) || Array.isArray(value.oneOf)) {
      return this.collectMessageNames(value.oneOf, fallback, visited);
    }

    return fallback === undefined ? [] : [fallback];
  }

  private resolveObject(value: unknown): JsonObject | undefined {
    if (!AsyncApiEventCollector.isObject(value)) return undefined;

    if (typeof value.$ref === 'string') {
      const referenced = this.resolveReference(value.$ref);
      return AsyncApiEventCollector.isObject(referenced) ? referenced : undefined;
    }

    return value;
  }

  private resolveReference(reference: string): unknown {
    if (!reference.startsWith('#/')) return undefined;

    return reference
      .slice(2)
      .split('/')
      .map((segment) => decodeURIComponent(segment).replaceAll('~1', '/').replaceAll('~0', '~'))
      .reduce<unknown>((current, segment) => {
        return AsyncApiEventCollector.isObject(current) ? current[segment] : undefined;
      }, this.document);
  }

  private static referenceName(reference: string): string | undefined {
    const segment = reference.split('/').at(-1);
    return segment === undefined
      ? undefined
      : decodeURIComponent(segment).replaceAll('~1', '/').replaceAll('~0', '~');
  }

  private static isObject(value: unknown): value is JsonObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
