import { describe, expect, it, vi } from 'vitest';
import { AsyncApiSpecification } from '../../../src/lib/asyncapi/AsyncApiSpecification';
import { MigrateAsyncApi } from '../../../src/lib/asyncapi/MigrateAsyncApi';
import type { AsyncApiMigration } from '../../../src/lib/asyncapi/migrate/AsyncApiMigration';

describe('MigrateAsyncApi', () => {
  it('reads, migrates and overwrites the supplied specification', () => {
    const source = { asyncapi: '2.0.0' };
    const target = { asyncapi: '3.0.0' };
    const reader = { read: vi.fn(() => new AsyncApiSpecification(source)) };
    const writer = { write: vi.fn() };
    const migrate = vi.fn(() => target);
    const migration: AsyncApiMigration = {
      action: 'to-structured',
      migrate,
    };
    const migrationFactory = { create: vi.fn(() => migration) };

    const result = new MigrateAsyncApi(reader, writer, migrationFactory).execute(
      'asyncapi.json',
      'to-structured',
    );

    expect(result).toEqual(target);
    expect(reader.read).toHaveBeenCalledWith('asyncapi.json');
    expect(migrationFactory.create).toHaveBeenCalledWith('to-structured');
    expect(migrate).toHaveBeenCalledWith(source);
    expect(writer.write).toHaveBeenCalledWith('asyncapi.json', target);
  });
});
