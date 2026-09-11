import { describe, expect, it } from 'vitest';
import { logger } from '../lib/logger';

describe('logger', () => {
  it('routes all used log levels to stderr to protect the stdio stream', () => {
    const transport = logger.transports[0] as unknown as {
      stderrLevels: Record<string, boolean>;
    };

    expect(transport.stderrLevels).toMatchObject({
      error: true,
      warn: true,
      info: true,
      debug: true,
    });
  });
});
