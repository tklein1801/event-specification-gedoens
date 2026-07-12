import { test } from '@drizzle-team/brocli';
import { describe, expect, it, vi } from 'vitest';
import { createMigrateCommand } from '../../src/commands/migrate/migrate.cmd';

describe('migrate command', () => {
  it('requires an action and specification path', async () => {
    const result = await test(createMigrateCommand({ execute: vi.fn() }), '');

    expect(result.type).toBe('error');
  });

  it('accepts a supported migration and the supplied specification', async () => {
    const migrator = { execute: vi.fn() };
    const command = createMigrateCommand(migrator);

    const result = await test(command, 'to-structured asyncapi.json');

    expect(result).toEqual({
      type: 'handler',
      options: { action: 'to-structured', specification: 'asyncapi.json' },
    });
  });

  it('rejects unsupported migration actions', async () => {
    const result = await test(
      createMigrateCommand({ execute: vi.fn() }),
      'unsupported asyncapi.json',
    );

    expect(result.type).toBe('error');
  });
});
