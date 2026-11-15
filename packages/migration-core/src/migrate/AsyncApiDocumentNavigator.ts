import type { AsyncApiDocument } from '../AsyncApiSpecification';
import { InvalidAsyncApiSpecification } from '../InvalidAsyncApiSpecification';

export type JsonObject = Record<string, unknown>;

const SCHEMA_MAPS = new Set([
  'properties',
  'patternProperties',
  'definitions',
  '$defs',
  'dependentSchemas',
  'dependencies',
]);
const SCHEMA_VALUES = new Set([
  'items',
  'additionalItems',
  'additionalProperties',
  'contains',
  'propertyNames',
  'not',
  'if',
  'then',
  'else',
  'unevaluatedItems',
  'unevaluatedProperties',
  'allOf',
  'anyOf',
  'oneOf',
  'prefixItems',
]);

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

  resolveSchemaReferences(value: unknown, resolving = new Set<string>()): unknown {
    if (Array.isArray(value))
      return value.map((item) => this.resolveSchemaReferences(item, resolving));
    if (!AsyncApiDocumentNavigator.isObject(value)) return structuredClone(value);
    if (typeof value.$ref === 'string') {
      const ref = value.$ref;
      if (!ref.startsWith('#/')) {
        throw new InvalidAsyncApiSpecification(
          `Schema reference '${ref}' cannot be resolved locally.`,
        );
      }
      if (resolving.has(ref)) {
        throw new InvalidAsyncApiSpecification(
          `Circular schema reference '${ref}' cannot be fully resolved.`,
        );
      }
      const target = this.resolve(value);
      if (target === undefined) {
        throw new InvalidAsyncApiSpecification(`Schema reference '${ref}' cannot be resolved.`);
      }
      const next = new Set(resolving).add(ref);
      const resolved = this.resolveSchemaReferences(target, next);
      const siblings = AsyncApiDocumentNavigator.omit(value, ['$ref']);
      return AsyncApiDocumentNavigator.isObject(resolved)
        ? { ...resolved, ...(this.resolveSchemaReferences(siblings, next) as JsonObject) }
        : resolved;
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        SCHEMA_MAPS.has(key) && AsyncApiDocumentNavigator.isObject(child)
          ? Object.fromEntries(
              Object.entries(child).map(([name, schema]) => [
                name,
                this.resolveSchemaReferences(schema, resolving),
              ]),
            )
          : SCHEMA_VALUES.has(key)
            ? this.resolveSchemaReferences(child, resolving)
            : structuredClone(child),
      ]),
    );
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
