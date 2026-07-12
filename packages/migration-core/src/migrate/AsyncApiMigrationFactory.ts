import type { AsyncApiMigration, MigrationAction } from './AsyncApiMigration';
import { ToStructuredAsyncApiMigration } from './ToStructuredAsyncApiMigration';
import { ToUnstructuredAsyncApiMigration } from './ToUnstructuredAsyncApiMigration';

export interface MigrationFactory {
  create(action: MigrationAction): AsyncApiMigration;
}

export class AsyncApiMigrationFactory implements MigrationFactory {
  create(action: MigrationAction): AsyncApiMigration {
    return action === 'to-structured'
      ? new ToStructuredAsyncApiMigration()
      : new ToUnstructuredAsyncApiMigration();
  }
}
