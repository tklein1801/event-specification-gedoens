import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { EpSdkClient } from '@solace-labs/ep-sdk';
import { OpenAPI as EpOpenApi } from '@solace-labs/ep-openapi-node';
import { OpenAPI as EpRtOpenApi } from '@solace-labs/ep-rt-openapi-node';
import cors from 'cors';
import express from 'express';
import type { Config } from './lib/config';
import {
  getEnvironmentAuth,
  runWithRequestAuthContext,
  type RequestAuthContext,
} from './lib/requestAuth';
import { apiKeyMiddleware, handleError, logRequest, rateLimitMiddleware } from './middleware';
import { registerAllTools } from './tools';
import { logger } from './lib/logger';
import { getToolCall, runWithToolLoggingContext } from './lib/toolLogging';
import { createHttpTransport, createTransport, type TransportType } from './transport';

export async function runServer(config: Config, type: TransportType = 'http') {
  if (type === 'stdio') {
    return runStdioServer(config);
  }

  return runHttpServer(config);
}

async function runStdioServer(config: Config) {
  const requestAuth = getEnvironmentAuth();
  if (!requestAuth) {
    throw new Error('SOLACE_CLOUD_TOKEN is required when using the stdio transport.');
  }

  EpSdkClient.initialize({
    globalEpOpenAPI: EpOpenApi,
    globalEpRtOpenAPI: EpRtOpenApi,
    token: requestAuth.token,
  });

  const server = new McpServer({ name: config.service, version: config.version });
  registerAllTools(server);
  await runWithRequestAuthContext(requestAuth, async () => {
    await server.connect(createTransport('stdio'));
  });
}

function runHttpServer(config: Config) {
  const app = express();
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

    logger.debug('Initializing EpSdkClient', {
      actor: requestAuth.actor,
      authMethod: requestAuth.authMethod,
    });

    EpSdkClient.initialize({
      globalEpOpenAPI: EpOpenApi,
      globalEpRtOpenAPI: EpRtOpenApi,
      token: requestAuth.token,
    });

    logger.debug('EpSdkClient initialized', {
      actor: requestAuth.actor,
    });

    await runWithRequestAuthContext(requestAuth, async () => {
      const server = new McpServer({ name: config.service, version: config.version });
      registerAllTools(server);

      const transport = createHttpTransport();

      await server.connect(transport);

      try {
        await runWithToolLoggingContext(getToolCall(req.body), () =>
          transport.handleRequest(req, res, req.body),
        );
      } finally {
        await server.close();
      }
    });
  });

  app.use(handleError);

  const server = app.listen(config.port, () => {
    const options = {
      'Application Name': config.service,
      'Application Version': config.version,
      'Runtime Environment': config.runtime,
      'Log Level': config.logLevel,
      'Node Version': process.version,
      'Server Port': config.port,
      'Auth Sources': 'Authorization, X-Api-Key, SOLACE_CLOUD_TOKEN',
    };
    console.table(options);

    logger.info(`${config.service} is running on port ${config.port}`);
  });

  return { app, server };
}
