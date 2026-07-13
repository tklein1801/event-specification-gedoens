import { AsyncApiSpecification, type AsyncApiDocument } from './AsyncApiSpecification';
import { InvalidAsyncApiSpecification } from './InvalidAsyncApiSpecification';
import { AsyncApiMigrationFactory } from './migrate/AsyncApiMigrationFactory';
import type { MigrationAction } from './migrate/AsyncApiMigration';

export function parseJsonAsyncApi(input: string): AsyncApiDocument {
  if (input.trim().length === 0) {
    throw new InvalidAsyncApiSpecification(
      'Provide an AsyncAPI specification before starting the migration.',
      'EMPTY_INPUT',
    );
  }

  let value: unknown;
  try {
    value = JSON.parse(input);
  } catch (error) {
    throw new InvalidAsyncApiSpecification(
      'The input does not contain valid JSON.',
      'INVALID_SYNTAX',
      { cause: error },
    );
  }

  return new AsyncApiSpecification(value).toDocument();
}

export function migrateJsonAsyncApi(input: string, action: MigrationAction): AsyncApiDocument {
  const source = parseJsonAsyncApi(input);
  return new AsyncApiMigrationFactory().create(action).migrate(source);
}
