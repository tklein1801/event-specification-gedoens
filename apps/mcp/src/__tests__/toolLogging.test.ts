import { describe, expect, it, vi } from 'vitest';
import { logger } from '../lib/logger';
import { getToolCall, logToolSuccess, runWithToolLoggingContext } from '../lib/toolLogging';

describe('tool logging', () => {
  it('extracts tool calls without exposing the arguments', () => {
    expect(
      getToolCall({
        method: 'tools/call',
        params: { name: 'create_schema', arguments: { name: 'orders' } },
      }),
    ).toEqual({
      toolName: 'create_schema',
      arguments: { name: 'orders' },
    });
    expect(getToolCall({ method: 'tools/list' })).toBeUndefined();
  });

  it('logs a successful operation with its CRUD action and duration', async () => {
    const info = vi.spyOn(logger, 'info').mockImplementation(() => logger);

    await runWithToolLoggingContext(
      { toolName: 'delete_schema', arguments: { schemaId: 'schema-1' } },
      async () => {
        logToolSuccess();
      },
    );

    expect(info).toHaveBeenCalledWith(
      'MCP tool operation completed: %s',
      'schema deleted',
      expect.objectContaining({
        tool: 'delete_schema',
        durationMs: expect.any(Number),
      }),
    );
    info.mockRestore();
  });
});
