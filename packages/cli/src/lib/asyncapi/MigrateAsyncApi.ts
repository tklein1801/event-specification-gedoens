import {
  AsyncApiMigrationFactory,
  type AsyncApiDocument,
  type AsyncApiMigration,
  type AsyncApiSpecification,
  type MigrationAction,
} from '@event-specification-gedoens/migration-core';
import { log } from '../decorators/log.decorator';
import { AsyncApiSpecificationReader } from './AsyncApiSpecificationReader';
import {
  AsyncApiSpecificationWriter,
  type SpecificationWriter,
} from './AsyncApiSpecificationWriter';

export interface MigrationFactory {
  create(action: MigrationAction): AsyncApiMigration;
}

export interface SpecificationReader {
  read(filePath: string): AsyncApiSpecification;
}

export interface AsyncApiMigrator {
  execute(filePath: string, action: MigrationAction): AsyncApiDocument;
}

export class MigrateAsyncApi implements AsyncApiMigrator {
  constructor(
    private readonly reader: SpecificationReader = new AsyncApiSpecificationReader(),
    private readonly writer: SpecificationWriter = new AsyncApiSpecificationWriter(),
    private readonly migrationFactory: MigrationFactory = new AsyncApiMigrationFactory(),
  ) {}

  @log
  execute(filePath: string, action: MigrationAction): AsyncApiDocument {
    const source = this.reader.read(filePath).toDocument();
    const target = this.migrationFactory.create(action).migrate(source);
    this.writer.write(filePath, target);
    return target;
  }
}
