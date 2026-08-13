import { AsyncLocalStorage } from 'node:async_hooks';
import type { Request } from 'express';
import { logger } from './logger';

type AuthSource = 'authorization' | 'x-api-key' | 'environment';
type AuthMethod = 'bearer-token' | 'api-key' | 'environment-token';

export type RequestAuthContext = {
  token: string;
  headerName: AuthSource;
  authMethod: AuthMethod;
  actor: string;
};

const requestAuthStorage = new AsyncLocalStorage<RequestAuthContext>();

export function runWithRequestAuthContext<T>(
  context: RequestAuthContext,
  callback: () => Promise<T>,
): Promise<T> {
  return requestAuthStorage.run(context, callback);
}

export function getRequestAuthContext(): RequestAuthContext | undefined {
  return requestAuthStorage.getStore();
}

function getHeaderValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0]?.trim() || null;
  }
  return value?.trim() || null;
}

function getActorFingerprint(token: string): string {
  if (token.length <= 8) return token;
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

function getBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null;
  const [scheme, token] = authorizationHeader.split(/\s+/, 2);
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== 'bearer') return null;
  return token.trim() || null;
}

export function extractRequestAuth(req: Pick<Request, 'headers'>): RequestAuthContext | null {
  const environmentToken = process.env.SOLACE_CLOUD_TOKEN?.trim();
  const apiKey = getHeaderValue(req.headers['x-api-key']);
  if (apiKey) {
    warnIfEnvironmentTokenOverridden(environmentToken, 'X-Api-Key');
    return createAuthContext(apiKey, 'x-api-key', 'api-key');
  }

  const bearerToken = getBearerToken(getHeaderValue(req.headers.authorization));
  if (bearerToken) {
    warnIfEnvironmentTokenOverridden(environmentToken, 'Authorization');
    return createAuthContext(bearerToken, 'authorization', 'bearer-token');
  }

  if (!environmentToken) return null;

  return createAuthContext(environmentToken, 'environment', 'environment-token');
}

function warnIfEnvironmentTokenOverridden(
  environmentToken: string | undefined,
  headerName: string,
) {
  if (!environmentToken) return;

  logger.warn('MCP request authentication header %s overrides SOLACE_CLOUD_TOKEN.', headerName);
}

function createAuthContext(
  token: string,
  headerName: AuthSource,
  authMethod: AuthMethod,
): RequestAuthContext {
  return {
    token,
    headerName,
    authMethod,
    actor: getActorFingerprint(token),
  };
}
