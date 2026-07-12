import { test } from '@drizzle-team/brocli';
import { describe, expect, it, vi } from 'vitest';
import { createListComponentsCommand } from '../../src/commands/list-components.command';
import { ListEvents } from '../../src/commands/list-events/list-events.cmd';
import { AsyncApiSpecification } from '@event-specification-gedoens/migration-core';
import { AsyncApiSpecificationReader } from '../../src/lib/asyncapi/AsyncApiSpecificationReader';

describe('list component commands', () => {
  it('requires the AsyncAPI specification path', async () => {
    const command = createCommand('messages');

    const result = await test(command, '');

    expect(result.type).toBe('error');
  });

  it('accepts the AsyncAPI specification path as a positional argument', async () => {
    const command = createCommand('schemas');

    const result = await test(command, 'asyncapi.json');

    expect(result).toEqual({
      type: 'handler',
      options: { specification: 'asyncapi.json' },
    });
  });

  it('provides the same specification input for list-events', async () => {
    const result = await test(ListEvents, 'asyncapi.json');

    expect(result).toEqual({
      type: 'handler',
      options: { specification: 'asyncapi.json' },
    });
  });
});

function createCommand(component: 'messages' | 'schemas') {
  const reader = new AsyncApiSpecificationReader();
  vi.spyOn(reader, 'read').mockReturnValue(new AsyncApiSpecification({ asyncapi: '3.0.0' }));

  return createListComponentsCommand(
    {
      name: `list-${component}`,
      aliases: [component === 'messages' ? 'lm' : 'ls'],
      component,
      description: `List ${component}`,
    },
    reader,
    vi.fn(),
  );
}
