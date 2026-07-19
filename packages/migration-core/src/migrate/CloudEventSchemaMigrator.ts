import { InvalidAsyncApiSpecification } from '../InvalidAsyncApiSpecification';
import type { AsyncApiDocument } from '../AsyncApiSpecification';
import { AsyncApiDocumentNavigator, type JsonObject } from './AsyncApiDocumentNavigator';
import { CloudEventMessageMigrator } from './CloudEventMessageMigrator';

/**
 * Keeps self-contained CloudEvent envelopes in components.schemas and lets
 * messages reference them. The source navigator deliberately continues to point
 * at the unmodified input document while the target schema map is built.
 */
export class CloudEventSchemaMigrator {
  private readonly schemas: Record<string, unknown>;
  private readonly messageTraits: Record<string, unknown>;
  private readonly claimedSchemaNames = new Set<string>();
  private readonly cloudEventTraitProperties: JsonObject = {};
  private readonly cloudEventTraitRequired = new Set<string>();
  private readonly cloudEventTraitName: string;
  private hasUnstructuredMessages = false;

  constructor(
    document: AsyncApiDocument,
    private readonly navigator: AsyncApiDocumentNavigator,
    private readonly messageMigrator: CloudEventMessageMigrator,
  ) {
    const schemas = document.components?.schemas;
    if (schemas !== undefined && !AsyncApiDocumentNavigator.isObject(schemas)) {
      throw new InvalidAsyncApiSpecification('The components.schemas value must be an object.');
    }
    this.schemas = structuredClone(schemas ?? {});

    const messageTraits = document.components?.messageTraits;
    if (messageTraits !== undefined && !AsyncApiDocumentNavigator.isObject(messageTraits)) {
      throw new InvalidAsyncApiSpecification(
        'The components.messageTraits value must be an object.',
      );
    }
    this.messageTraits = structuredClone(messageTraits ?? {});
    this.cloudEventTraitName = this.availableComponentName('CloudEventContext', this.messageTraits);
  }

  toStructured(message: JsonObject, preferredSchemaName?: string): JsonObject {
    const migrated = this.messageMigrator.toStructured(message);
    const envelope = this.requireObject(migrated.payload, 'A structured message payload');
    const referencedName = this.localSchemaName(message.payload);
    const schemaName = this.claimSchemaName(referencedName, preferredSchemaName);
    const resolvedEnvelope = this.requireObject(
      this.resolveSchemaReferences(envelope),
      'A resolved structured message payload',
    );

    this.schemas[schemaName] = structuredClone(resolvedEnvelope);

    return {
      ...migrated,
      payload: { $ref: AsyncApiDocumentNavigator.pointer('components', 'schemas', schemaName) },
    };
  }

  toUnstructured(message: JsonObject, preferredSchemaName?: string): JsonObject {
    const flattened = this.messageMigrator.toUnstructured(message);
    const outputName = this.messageName(flattened, preferredSchemaName ?? 'payload');
    const migrated = this.withCloudEventTrait(flattened);
    const referencedName = this.localSchemaName(message.payload);

    if (referencedName !== undefined) {
      this.claimedSchemaNames.add(referencedName);
      const schema = this.extractNestedSchemas(
        this.withPrimitiveFormats(migrated.payload ?? {}),
        referencedName,
      );
      this.schemas[referencedName] = schema;
      return {
        ...migrated,
        name: outputName === 'payload' ? referencedName : outputName,
        payload: {
          $ref: AsyncApiDocumentNavigator.pointer('components', 'schemas', referencedName),
        },
      };
    }

    if (this.localSchemaName(migrated.payload) !== undefined) return migrated;

    const schemaName = this.claimSchemaName(undefined, preferredSchemaName);
    this.schemas[schemaName] = this.extractNestedSchemas(
      this.withPrimitiveFormats(migrated.payload ?? {}),
      schemaName,
    );
    return {
      ...migrated,
      name: outputName === 'payload' ? schemaName : outputName,
      payload: { $ref: AsyncApiDocumentNavigator.pointer('components', 'schemas', schemaName) },
    };
  }

  withSchemas(
    components: JsonObject | undefined,
    resolveReferences = false,
    retainedSchemaNames?: ReadonlySet<string>,
  ): JsonObject | undefined {
    const result = { ...(components ?? {}) };
    delete result.schemas;
    const schemaEntries = Object.entries(this.schemas).filter(
      ([name]) => retainedSchemaNames === undefined || retainedSchemaNames.has(name),
    );
    if (schemaEntries.length > 0) {
      result.schemas = resolveReferences
        ? Object.fromEntries(
            schemaEntries.map(([name, schema]) => [name, this.resolveSchemaReferences(schema)]),
          )
        : Object.fromEntries(schemaEntries);
    }
    if (this.hasUnstructuredMessages) {
      result.messageTraits = {
        ...this.messageTraits,
        [this.cloudEventTraitName]: {
          headers: {
            type: 'object',
            properties: this.cloudEventTraitProperties,
            ...(this.cloudEventTraitRequired.size > 0
              ? { required: [...this.cloudEventTraitRequired] }
              : {}),
          },
        },
      };
    }
    return Object.keys(result).length === 0 ? undefined : result;
  }

  private messageName(message: JsonObject, fallback: string): string {
    if (typeof message.name === 'string' && message.name.length > 0) return message.name;
    const headers = AsyncApiDocumentNavigator.isObject(message.headers) ? message.headers : undefined;
    const properties = AsyncApiDocumentNavigator.isObject(headers?.properties)
      ? headers.properties
      : undefined;
    const type = AsyncApiDocumentNavigator.isObject(properties?.type)
      ? properties.type.const
      : undefined;
    return typeof type === 'string' && type.length > 0 ? type : fallback;
  }

  private extractNestedSchemas(schema: unknown, parentName: string): JsonObject {
    if (!AsyncApiDocumentNavigator.isObject(schema)) return structuredClone(schema) as JsonObject;

    const extract = (value: unknown, name: string): unknown => {
      if (Array.isArray(value)) return value.map((item) => extract(item, name));
      if (!AsyncApiDocumentNavigator.isObject(value)) return structuredClone(value);

      const result = structuredClone(value) as JsonObject;
      const properties = result.properties;
      if (result.type === 'object' && AsyncApiDocumentNavigator.isObject(properties)) {
        result.properties = Object.fromEntries(
          Object.entries(properties).map(([propertyName, propertySchema]) => {
            const child = this.withPrimitiveFormats(propertySchema);
            if (
              AsyncApiDocumentNavigator.isObject(child) &&
              child.type === 'object'
            ) {
              const childName = this.claimNestedSchemaName(name, propertyName);
              this.schemas[childName] = extract(child, childName) as JsonObject;
              return [
                propertyName,
                { $ref: AsyncApiDocumentNavigator.pointer('components', 'schemas', childName) },
              ];
            }
            if (
              AsyncApiDocumentNavigator.isObject(child) &&
              child.type === 'array' &&
              AsyncApiDocumentNavigator.isObject(child.items) &&
              child.items.type === 'object'
            ) {
              const childName = this.claimNestedSchemaName(name, propertyName);
              const itemsSchema = extract(child.items, childName) as JsonObject;
              this.schemas[childName] = itemsSchema;
              return [
                propertyName,
                {
                  ...child,
                  items: {
                    $ref: AsyncApiDocumentNavigator.pointer('components', 'schemas', childName),
                  },
                },
              ];
            }
            return [propertyName, extract(child, `${name}_${propertyName}`)];
          }),
        );
      }
      return result;
    };

    return extract(schema, parentName) as JsonObject;
  }

  private withPrimitiveFormats(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((item) => this.withPrimitiveFormats(item));
    if (!AsyncApiDocumentNavigator.isObject(value)) return structuredClone(value);

    const result = Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, this.withPrimitiveFormats(child)]),
    ) as JsonObject;
    if (result.type === 'integer') result.format = 'int64';
    if (result.type === 'number') result.format = 'decimal';
    return result;
  }

  private claimNestedSchemaName(parentName: string, propertyName: string): string {
    const base = `${parentName}_${propertyName}`.replaceAll('/', '_');
    let name = base;
    let suffix = 2;
    while (this.claimedSchemaNames.has(name) || Object.hasOwn(this.schemas, name)) {
      name = `${base}_${suffix}`;
      suffix += 1;
    }
    this.claimedSchemaNames.add(name);
    return name;
  }

  private withCloudEventTrait(message: JsonObject): JsonObject {
    const headers = this.requireObject(message.headers, 'An unstructured message headers value');
    const properties = this.requireObject(
      headers.properties,
      'An unstructured message header properties value',
    );
    this.hasUnstructuredMessages = true;

    for (const [name, schema] of Object.entries(properties)) {
      const current = this.cloudEventTraitProperties[name];
      this.cloudEventTraitProperties[name] =
        current === undefined ? structuredClone(schema) : this.commonHeaderSchema(current, schema);
    }
    if (Array.isArray(headers.required)) {
      for (const name of headers.required) {
        if (typeof name === 'string') this.cloudEventTraitRequired.add(name);
      }
    }

    const traitReference = {
      $ref: AsyncApiDocumentNavigator.pointer(
        'components',
        'messageTraits',
        this.cloudEventTraitName,
      ),
    };
    const traits = Array.isArray(message.traits) ? [...message.traits] : [];
    if (
      !traits.some(
        (trait) => AsyncApiDocumentNavigator.isObject(trait) && trait.$ref === traitReference.$ref,
      )
    ) {
      traits.push(traitReference);
    }
    const retainedHeaderProperties = Object.fromEntries(
      Object.entries(properties).filter(
        ([name]) => name === 'type' || name === 'datacontenttype',
      ),
    );
    return {
      ...message,
      ...(Object.keys(retainedHeaderProperties).length > 0
        ? { headers: { properties: retainedHeaderProperties } }
        : {}),
      traits,
    };
  }

  private commonHeaderSchema(current: unknown, candidate: unknown): unknown {
    if (JSON.stringify(current) === JSON.stringify(candidate)) return current;
    if (
      !AsyncApiDocumentNavigator.isObject(current) ||
      !AsyncApiDocumentNavigator.isObject(candidate)
    ) {
      return {};
    }

    const common = Object.fromEntries(
      Object.entries(current).filter(([key, value]) => {
        return (
          key !== 'const' &&
          key !== 'default' &&
          JSON.stringify(candidate[key]) === JSON.stringify(value)
        );
      }),
    );
    if (Object.keys(common).length === 0) common.type = 'string';
    return common;
  }

  private availableComponentName(base: string, components: Record<string, unknown>): string {
    if (!Object.hasOwn(components, base)) return base;
    let suffix = 2;
    while (Object.hasOwn(components, `${base}_${suffix}`)) suffix += 1;
    return `${base}_${suffix}`;
  }

  private resolveSchemaReferences(value: unknown, resolving = new Set<string>()): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.resolveSchemaReferences(item, resolving));
    }
    if (!AsyncApiDocumentNavigator.isObject(value)) return structuredClone(value);

    if (typeof value.$ref === 'string') {
      if (!value.$ref.startsWith('#/')) {
        throw new InvalidAsyncApiSpecification(
          `Schema reference '${value.$ref}' cannot be resolved locally.`,
        );
      }
      if (resolving.has(value.$ref)) {
        throw new InvalidAsyncApiSpecification(
          `Circular schema reference '${value.$ref}' cannot be fully resolved.`,
        );
      }
      const resolved = this.navigator.resolve(value);
      if (resolved === undefined) {
        throw new InvalidAsyncApiSpecification(
          `Schema reference '${value.$ref}' cannot be resolved.`,
        );
      }

      const nextResolving = new Set(resolving).add(value.$ref);
      const siblings = AsyncApiDocumentNavigator.omit(value, ['$ref']);
      const resolvedValue = this.resolveSchemaReferences(resolved, nextResolving);
      return AsyncApiDocumentNavigator.isObject(resolvedValue)
        ? {
            ...resolvedValue,
            ...(this.resolveSchemaReferences(siblings, nextResolving) as JsonObject),
          }
        : resolvedValue;
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        this.resolveSchemaReferences(child, resolving),
      ]),
    );
  }

  private claimSchemaName(
    referencedName: string | undefined,
    preferredName: string | undefined,
  ): string {
    if (referencedName !== undefined && !this.claimedSchemaNames.has(referencedName)) {
      this.claimedSchemaNames.add(referencedName);
      return referencedName;
    }

    const base = (preferredName?.trim() || referencedName || 'payload').replaceAll('/', '_');
    let name = base;
    let suffix = 2;
    while (this.claimedSchemaNames.has(name) || Object.hasOwn(this.schemas, name)) {
      name = `${base}_${suffix}`;
      suffix += 1;
    }
    this.claimedSchemaNames.add(name);
    return name;
  }

  private localSchemaName(value: unknown): string | undefined {
    if (!AsyncApiDocumentNavigator.isObject(value) || typeof value.$ref !== 'string') {
      return undefined;
    }
    return value.$ref.startsWith('#/components/schemas/')
      ? AsyncApiDocumentNavigator.referenceName(value.$ref)
      : undefined;
  }

  private requireObject(value: unknown, field: string): JsonObject {
    if (!AsyncApiDocumentNavigator.isObject(value)) {
      throw new InvalidAsyncApiSpecification(`${field} must be an object.`);
    }
    return value;
  }
}
