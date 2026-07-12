import { log } from '../decorators/log.decorator';
import { InvalidAsyncApiSpecification } from '../error/InvalidAsyncApiSpecification';
import { AsyncApiEventCollector, type AsyncApiEvent } from './AsyncApiEventCollector';

export type ListableComponent = 'messages' | 'schemas';

export interface AsyncApiDocument {
  asyncapi: string;
  components?: Partial<Record<ListableComponent, Record<string, unknown>>>;
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

  @log
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

  @log
  listEvents(): AsyncApiEvent[] {
    return new AsyncApiEventCollector(this.#document).collect();
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
