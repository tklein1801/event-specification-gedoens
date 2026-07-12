import { parse, stringify } from 'yaml';
import { AsyncApiSpecification, type AsyncApiDocument } from './AsyncApiSpecification';
import { InvalidAsyncApiSpecification } from './InvalidAsyncApiSpecification';
import { AsyncApiMigrationFactory } from './migrate/AsyncApiMigrationFactory';
import type { MigrationAction } from './migrate/AsyncApiMigration';

export type SpecificationFormat = 'json' | 'yaml';

export interface MigratedAsyncApiText {
  document: AsyncApiDocument;
  content: string;
  format: SpecificationFormat;
}

export function parseAsyncApi(input: string | object): AsyncApiDocument {
  let value: unknown = input;

  if (typeof input === 'string') {
    if (input.trim().length === 0) {
      throw new InvalidAsyncApiSpecification(
        'Provide an AsyncAPI specification before starting the migration.',
        'EMPTY_INPUT',
      );
    }

    try {
      value = parse(input);
    } catch (error) {
      throw new InvalidAsyncApiSpecification(
        'The input does not contain valid JSON or YAML.',
        'INVALID_SYNTAX',
        { cause: error },
      );
    }
  }

  return new AsyncApiSpecification(value).toDocument();
}

export function migrateAsyncApi(input: string | object, action: MigrationAction): AsyncApiDocument {
  const source = parseAsyncApi(input);
  return new AsyncApiMigrationFactory().create(action).migrate(source);
}

export function migrateAsyncApiText(
  input: string,
  action: MigrationAction,
  format: SpecificationFormat = detectSpecificationFormat(input),
): MigratedAsyncApiText {
  const document = migrateAsyncApi(input, action);
  return {
    document,
    content: serializeAsyncApi(document, format),
    format,
  };
}

export function serializeAsyncApi(document: AsyncApiDocument, format: SpecificationFormat): string {
  return format === 'json'
    ? `${JSON.stringify(document, null, 2)}\n`
    : stringify(document, { indent: 2, lineWidth: 0 });
}

export function detectSpecificationFormat(input: string): SpecificationFormat {
  const trimmed = input.trimStart();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
  return 'yaml';
}
