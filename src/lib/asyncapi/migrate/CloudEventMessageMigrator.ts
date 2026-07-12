import { log } from '../../decorators/log.decorator';
import { InvalidAsyncApiSpecification } from '../../error/InvalidAsyncApiSpecification';
import { AsyncApiDocumentNavigator, type JsonObject } from './AsyncApiDocumentNavigator';

const CLOUD_EVENT_REQUIRED = ['specversion', 'id', 'source', 'type'];

const CLOUD_EVENT_PROPERTIES: JsonObject = {
  specversion: { type: 'string', const: '1.0' },
  id: { type: 'string' },
  source: { type: 'string', format: 'uri-reference' },
  type: { type: 'string' },
  time: { type: 'string', format: 'date-time' },
  datacontenttype: { type: 'string', const: 'application/json' },
};

export class CloudEventMessageMigrator {
  constructor(private readonly navigator: AsyncApiDocumentNavigator) {}

  @log
  toStructured(message: JsonObject): JsonObject {
    const payload = message.payload;
    const examples = message.examples;
    const messageFields = AsyncApiDocumentNavigator.omit(message, [
      'headers',
      'payload',
      'contentType',
      'examples',
      'traits',
    ]);
    const headerSchemas = this.collectHeaderSchemas(message);
    const headerProperties = Object.assign(
      {},
      ...headerSchemas.map((schema) =>
        AsyncApiDocumentNavigator.isObject(schema.properties) ? schema.properties : {},
      ),
    ) as JsonObject;
    const required = this.unique([
      ...CLOUD_EVENT_REQUIRED,
      ...headerSchemas.flatMap((schema) =>
        Array.isArray(schema.required)
          ? schema.required.filter((value): value is string => typeof value === 'string')
          : [],
      ),
      'data',
    ]);
    const datacontenttype = AsyncApiDocumentNavigator.isObject(headerProperties.datacontenttype)
      ? headerProperties.datacontenttype
      : { type: 'string', const: this.businessContentType(message) };

    return {
      ...messageFields,
      contentType: 'application/cloudevents+json',
      payload: {
        type: 'object',
        required,
        properties: {
          ...CLOUD_EVENT_PROPERTIES,
          ...headerProperties,
          datacontenttype,
          data: payload ?? {},
        },
      },
      ...(Array.isArray(examples) ? { examples: this.toStructuredExamples(examples) } : {}),
      ...this.withoutHeaderTraits(message.traits),
    };
  }

  @log
  toUnstructured(message: JsonObject): JsonObject {
    const envelope = this.navigator.resolveObject(message.payload);
    const properties = this.navigator.resolveObject(envelope?.properties);

    if (envelope === undefined || properties === undefined || !('data' in properties)) {
      throw new InvalidAsyncApiSpecification(
        'A structured CloudEvent message must define payload.properties.data.',
      );
    }

    const { data, ...headerProperties } = properties;
    const required = Array.isArray(envelope.required)
      ? envelope.required.filter(
          (name): name is string => typeof name === 'string' && name !== 'data',
        )
      : [];
    const examples = message.examples;
    const messageFields = AsyncApiDocumentNavigator.omit(message, [
      'payload',
      'contentType',
      'examples',
    ]);

    return {
      ...messageFields,
      contentType: this.contentTypeFromProperties(headerProperties),
      headers: {
        type: 'object',
        properties: headerProperties,
        ...(required.length > 0 ? { required } : {}),
      },
      payload: data,
      ...(Array.isArray(examples) ? { examples: this.toUnstructuredExamples(examples) } : {}),
    };
  }

  private collectHeaderSchemas(message: JsonObject): JsonObject[] {
    const ownHeaders = this.navigator.resolveObject(message.headers);
    const traitHeaders = Array.isArray(message.traits)
      ? message.traits.flatMap((trait) => {
          const resolvedTrait = this.navigator.resolveObject(trait);
          const headers = this.navigator.resolveObject(resolvedTrait?.headers);
          return headers === undefined ? [] : [headers];
        })
      : [];

    return [...traitHeaders, ...(ownHeaders === undefined ? [] : [ownHeaders])];
  }

  private withoutHeaderTraits(traits: unknown): { traits?: unknown[] } {
    if (!Array.isArray(traits)) return {};

    const remainingTraits: unknown[] = traits.flatMap((trait: unknown): unknown[] => {
      const resolvedTrait = this.navigator.resolveObject(trait);
      if (resolvedTrait === undefined || resolvedTrait.headers === undefined) return [trait];

      const traitFields = AsyncApiDocumentNavigator.omit(resolvedTrait, ['headers']);
      return Object.keys(traitFields).length === 0 ? [] : [traitFields];
    });

    return remainingTraits.length > 0 ? { traits: remainingTraits } : {};
  }

  private businessContentType(message: JsonObject): string {
    return typeof message.contentType === 'string' ? message.contentType : 'application/json';
  }

  private contentTypeFromProperties(properties: JsonObject): string {
    const datacontenttype = properties.datacontenttype;

    if (AsyncApiDocumentNavigator.isObject(datacontenttype)) {
      if (typeof datacontenttype.const === 'string') return datacontenttype.const;
      if (typeof datacontenttype.default === 'string') return datacontenttype.default;
    }

    return 'application/json';
  }

  private toStructuredExamples(examples: unknown[]): unknown[] {
    return examples.map((example) => {
      if (!AsyncApiDocumentNavigator.isObject(example)) return example;

      const { headers, payload, ...fields } = example;
      return {
        ...fields,
        payload: {
          ...(AsyncApiDocumentNavigator.isObject(headers) ? headers : {}),
          data: payload,
        },
      };
    });
  }

  private toUnstructuredExamples(examples: unknown[]): unknown[] {
    return examples.map((example) => {
      if (!AsyncApiDocumentNavigator.isObject(example)) return example;
      const payload = this.navigator.resolveObject(example.payload);
      if (payload === undefined || !('data' in payload)) return example;

      const { data, ...headers } = payload;
      return { ...example, headers, payload: data };
    });
  }

  private unique(values: string[]): string[] {
    return [...new Set(values)];
  }
}
