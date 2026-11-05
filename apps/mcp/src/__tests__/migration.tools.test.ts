import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerMigrationTools } from '../tools/migration.tools';
import { registerAsyncApiExportTools } from '../tools/export.tools';
import { ApplicationsService, EventApIsService } from '@solace-labs/ep-openapi-node';

type ToolHandler = (input: Record<string, unknown>) => Promise<{
  isError?: boolean;
  content: Array<{ type: string; text: string }>;
}>;

function registeredHandlers(): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();
  const server = {
    registerTool(name: string, _config: unknown, handler: ToolHandler): void {
      handlers.set(name, handler);
    },
  };

  registerMigrationTools(server as never);
  return handlers;
}

function registeredExportHandlers(): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();
  const server = {
    registerTool(name: string, _config: unknown, handler: ToolHandler): void {
      handlers.set(name, handler);
    },
  };
  registerAsyncApiExportTools(server as never);
  return handlers;
}

describe('migrate_asyncapi MCP tool', () => {
  it('migrates YAML to structured AsyncAPI and returns formatted output', async () => {
    const handler = registeredHandlers().get('migrate_asyncapi');
    expect(handler).toBeDefined();

    const result = await handler!({
      content: 'asyncapi: 2.6.0\ninfo:\n  title: Orders\n  version: 1.0.0\n',
      action: 'to-structured',
    });

    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0].text);
    expect(response.format).toBe('yaml');
    expect(response.asyncapi).toBe('3.0.0');
    expect(response.content).toContain('asyncapi: 3.0.0');
  });

  it('migrates JSON to unstructured AsyncAPI as JSON', async () => {
    const handler = registeredHandlers().get('migrate_asyncapi');
    expect(handler).toBeDefined();

    const result = await handler!({
      content: '{"asyncapi":"3.0.0","info":{"title":"Orders","version":"1.0.0"}}',
      action: 'to-unstructured',
      format: 'json',
    });

    const response = JSON.parse(result.content[0].text);
    expect(response.format).toBe('json');
    expect(response.asyncapi).toBe('2.0.0');
    expect(JSON.parse(response.content).asyncapi).toBe('2.0.0');
  });

  it('returns an MCP error for an invalid migration input', async () => {
    const handler = registeredHandlers().get('migrate_asyncapi');
    expect(handler).toBeDefined();

    const result = await handler!({
      content: 'asyncapi: 3.0.0\n',
      action: 'to-structured',
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error:');
  });
});

describe('AsyncAPI export MCP tools', () => {
  afterEach(() => vi.restoreAllMocks());

  it('exports application AsyncAPI with default options', async () => {
    const exportSpy = vi
      .spyOn(ApplicationsService, 'getAsyncApiForApplicationVersion')
      .mockResolvedValue('asyncapi: 2.5.0\ninfo:\n  title: Orders\n  version: 1.0.0\n');
    const handler = registeredExportHandlers().get('export_application_asyncapi');
    const result = await handler!({ applicationVersionId: 'app-version-id' });

    expect(exportSpy).toHaveBeenCalledWith({
      applicationVersionId: 'app-version-id',
      format: 'yaml',
      asyncApiVersion: '2.5.0',
      includedExtensions: 'all',
    });
    const response = JSON.parse(result.content[0].text);
    expect(response.source).toBe('application');
    expect(response.content).toContain('asyncapi: 2.5.0');
  });

  it('exports Event API YAML using the requested options', async () => {
    const exportSpy = vi
      .spyOn(EventApIsService, 'getAsyncApiForEventApiVersion')
      .mockResolvedValue('asyncapi: 2.2.0\ninfo:\n  title: Orders\n  version: 1.0.0\n');
    const handler = registeredExportHandlers().get('export_event_api_asyncapi');
    const result = await handler!({
      eventApiVersionId: 'event-api-version-id',
      format: 'yaml',
      asyncApiVersion: '2.2.0',
      includedExtensions: 'none',
    });

    expect(exportSpy).toHaveBeenCalledWith({
      eventApiVersionId: 'event-api-version-id',
      format: 'yaml',
      asyncApiVersion: '2.2.0',
      includedExtensions: 'none',
    });
    expect(JSON.parse(result.content[0].text).content).toContain('asyncapi: 2.2.0');
  });

  it('returns an MCP error for invalid or empty export content', async () => {
    vi.spyOn(ApplicationsService, 'getAsyncApiForApplicationVersion').mockResolvedValue(' ');
    const handler = registeredExportHandlers().get('export_application_asyncapi');
    const result = await handler!({ applicationVersionId: 'app-version-id' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('empty content');
  });
});
