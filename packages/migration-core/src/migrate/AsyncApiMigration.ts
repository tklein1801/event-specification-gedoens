import type { AsyncApiDocument } from '../AsyncApiSpecification';

export type MigrationAction = 'to-structured' | 'to-unstructured';

export interface AsyncApiMigration {
  readonly action: MigrationAction;
  migrate(document: AsyncApiDocument): AsyncApiDocument;
}
