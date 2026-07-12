import { InvalidAsyncApiSpecification } from './InvalidAsyncApiSpecification';
import { AsyncApiEventCollector, type AsyncApiEvent } from './AsyncApiEventCollector';

export type ListableComponent = 'messageTraits' | 'messages' | 'schemas';

export interface AsyncApiDocument {
  asyncapi: string;
  components?: Partial<Record<ListableComponent, Record<string, unknown>>> &
    Record<string, unknown>;
  channels?: Record<string, unknown>;
  operations?: Record<string, unknown>;
  [key: string]: unknown;
}

export class AsyncApiSpecification {
  readonly #document: AsyncApiDocument;

  constructor(document: unknown) {
    if (!AsyncApiSpecification.isDocument(document)) {
      throw new InvalidAsyncApiSpecification(
        "The document must be an AsyncAPI specification with an 'asyncapi' version.",
      );
    }

    this.#document = document;
  }

  list(component: ListableComponent): string[] {
    const entries = this.#document.components?.[component];

    if (entries === undefined) {
      return [];
    }

    if (!AsyncApiSpecification.isRecord(entries)) {
      throw new InvalidAsyncApiSpecification(
        `The components.${component} value must be an object.`,
      );
    }

    return Object.keys(entries);
  }

  listEvents(): AsyncApiEvent[] {
    return new AsyncApiEventCollector(this.#document).collect();
  }

  toDocument(): AsyncApiDocument {
    return structuredClone(this.#document);
  }

  private static isDocument(value: unknown): value is AsyncApiDocument {
    if (!AsyncApiSpecification.isRecord(value) || typeof value.asyncapi !== 'string') {
      return false;
    }

    return value.components === undefined || AsyncApiSpecification.isRecord(value.components);
  }

  private static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
