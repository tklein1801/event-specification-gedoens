import type { AsyncApiDocument } from '../AsyncApiSpecification';

export type JsonObject = Record<string, unknown>;

export class AsyncApiDocumentNavigator {
  constructor(private readonly document: AsyncApiDocument) {}

  resolve(value: unknown): unknown {
    if (!AsyncApiDocumentNavigator.isObject(value) || typeof value.$ref !== 'string') {
      return value;
    }

    return this.resolveReference(value.$ref);
  }

  resolveObject(value: unknown): JsonObject | undefined {
    const resolved = this.resolve(value);
    return AsyncApiDocumentNavigator.isObject(resolved) ? resolved : undefined;
  }

  resolveReference(reference: string): unknown {
    if (!reference.startsWith('#/')) return undefined;

    return reference
      .slice(2)
      .split('/')
      .map((segment) => AsyncApiDocumentNavigator.unescapePointerSegment(segment))
      .reduce<unknown>((current, segment) => {
        return AsyncApiDocumentNavigator.isObject(current) ? current[segment] : undefined;
      }, this.document);
  }

  static referenceName(reference: string): string | undefined {
    const segment = reference.split('/').at(-1);
    return segment === undefined
      ? undefined
      : AsyncApiDocumentNavigator.unescapePointerSegment(segment);
  }

  static pointer(...segments: string[]): string {
    return `#/${segments.map((segment) => AsyncApiDocumentNavigator.escapePointerSegment(segment)).join('/')}`;
  }

  static isObject(value: unknown): value is JsonObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  static omit(value: JsonObject, keys: readonly string[]): JsonObject {
    return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
  }

  private static escapePointerSegment(segment: string): string {
    return segment.replaceAll('~', '~0').replaceAll('/', '~1');
  }

  private static unescapePointerSegment(segment: string): string {
    return decodeURIComponent(segment).replaceAll('~1', '/').replaceAll('~0', '~');
  }
}
