#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { EpSdkClient } from '@solace-labs/ep-sdk';
import { OpenAPI as EpOpenApi } from '@solace-labs/ep-openapi-node';
import { OpenAPI as EpRtOpenApi } from '@solace-labs/ep-rt-openapi-node';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import cors from 'cors';
import express from 'express';
import { config } from './config';
import { runWithRequestAuthContext, type RequestAuthContext } from './lib/requestAuth';
import { apiKeyMiddleware, handleError, logRequest, rateLimitMiddleware } from './middleware';
import { registerAllTools } from './tools';
import { logger } from './lib/logger';

export const app = express();
app.use(cors());
app.use(express.json());
app.use(logRequest);
if (config.runtime === 'production') {
  app.use(rateLimitMiddleware);
  logger.info('Rate limiting is enabled in production environment.');
} else
  logger.warn(
    'Rate limiting is disabled in non-production environments. Make sure to enable it in production to prevent abuse.',
  );

app.all(/^\/(api\/)?(status|health)\/?$/, async (_req, res) => {
  res.status(200).json({
    status: 'ok',
  });
});

// MCP endpoint (stateless – each request gets its own transport)
app.all('/mcp', apiKeyMiddleware, async (req, res) => {
  const requestAuth = res.locals.requestAuth as RequestAuthContext | undefined;
  if (!requestAuth) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  logger.debug('initializing EpSdkClient with actor: %s', requestAuth.actor);

  EpSdkClient.initialize({
    globalEpOpenAPI: EpOpenApi,
    globalEpRtOpenAPI: EpRtOpenApi,
    token: requestAuth.token,
  });

  logger.debug('EpSdkClient initialized with token: %s', requestAuth.actor);

  await runWithRequestAuthContext(requestAuth, async () => {
    const server = new McpServer({ name: config.service, version: config.version });
    registerAllTools(server);

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    await server.connect(transport);

    try {
      await transport.handleRequest(req, res, req.body);
    } finally {
      await server.close();
    }
  });
});

app.use(handleError);

export const server = app.listen(config.port, () => {
  const options = {
    'Application Name': config.service,
    'Application Version': config.version,
    'Runtime Environment': config.runtime,
    'Node Version': process.version,
    'Server Port': config.port,
    'Auth Headers': 'Authorization, X-Api-Key',
  };
  console.table(options);
});
