import { test as cliTest } from '@drizzle-team/brocli';
import { describe, expect, it } from 'vitest';
import { RunCommand } from '../commands/run.cmd';
import { getEnvironmentAuth } from '../lib/requestAuth';
import { createTransport } from '../transport';

describe('run command transport option', () => {
  it('defaults to the HTTP transport', async () => {
    const result = await cliTest(RunCommand, '');

    expect(result).toEqual({
      type: 'handler',
      options: {
        port: 3000,
        allowWrite: false,
        type: 'http',
      },
    });
  });

  it('accepts stdio as a transport', async () => {
    const result = await cliTest(RunCommand, '--type stdio');

    expect(result).toMatchObject({
      type: 'handler',
      options: { type: 'stdio' },
    });
  });

  it('rejects unsupported transports', async () => {
    const result = await cliTest(RunCommand, '--type websocket');

    expect(result.type).toBe('error');
  });
});

describe('transport selection', () => {
  it('creates a stdio transport', () => {
    expect(createTransport('stdio').constructor.name).toBe('StdioServerTransport');
  });

  it('creates an HTTP transport', () => {
    expect(createTransport('http').constructor.name).toBe('StreamableHTTPServerTransport');
  });
});

describe('stdio authentication', () => {
  it('uses only SOLACE_CLOUD_TOKEN', () => {
    process.env.SOLACE_CLOUD_TOKEN = 'stdio-token';

    expect(getEnvironmentAuth()).toMatchObject({
      token: 'stdio-token',
      authMethod: 'environment-token',
      headerName: 'environment',
    });
  });

  it('does not authenticate without SOLACE_CLOUD_TOKEN', () => {
    delete process.env.SOLACE_CLOUD_TOKEN;

    expect(getEnvironmentAuth()).toBeNull();
  });
});
