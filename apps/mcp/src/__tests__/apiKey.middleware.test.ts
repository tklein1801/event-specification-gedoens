import type { NextFunction, Request, Response } from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RequestAuthContext } from '../lib/requestAuth';
import { apiKeyMiddleware } from '../middleware/apiKey.middleware';

function makeReq(headers: Record<string, string> = {}): Request {
  return { headers } as unknown as Request;
}

function makeRes(): Response {
  const res = { locals: {}, status: vi.fn(), json: vi.fn() } as unknown as Response;
  (res.status as ReturnType<typeof vi.fn>).mockReturnValue(res);
  return res;
}

describe('apiKeyMiddleware', () => {
  afterEach(() => {
    delete process.env.SOLACE_CLOUD_TOKEN;
  });

  it('accepts an API key and stores request auth context', () => {
    const next = vi.fn() as NextFunction;
    const res = makeRes();
    apiKeyMiddleware(makeReq({ 'x-api-key': 'bb-api-key' }), res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.locals.requestAuth).toMatchObject<Partial<RequestAuthContext>>({
      token: 'bb-api-key',
      authMethod: 'api-key',
      headerName: 'x-api-key',
    });
  });

  it('accepts an Authorization header and stores request auth context', () => {
    const next = vi.fn() as NextFunction;
    const res = makeRes();
    apiKeyMiddleware(makeReq({ authorization: 'Be' + 'arer bb-access-token' }), res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.locals.requestAuth).toMatchObject<Partial<RequestAuthContext>>({
      token: 'bb-access-token',
      authMethod: 'bearer-token',
      headerName: 'authorization',
    });
  });

  it('prefers X-Api-Key when both credentials are present', () => {
    const next = vi.fn() as NextFunction;
    const res = makeRes();
    apiKeyMiddleware(
      makeReq({
        authorization: 'Be' + 'arer bb-access-token',
        'x-api-key': 'bb-api-key',
      }),
      res,
      next,
    );

    expect(next).toHaveBeenCalledOnce();
    expect(res.locals.requestAuth).toMatchObject<Partial<RequestAuthContext>>({
      token: 'bb-api-key',
      authMethod: 'api-key',
      headerName: 'x-api-key',
    });
  });

  it('returns 401 when no credentials are present', () => {
    const next = vi.fn() as NextFunction;
    const res = makeRes();
    apiKeyMiddleware(makeReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts SOLACE_CLOUD_TOKEN when no request credentials are present', () => {
    process.env.SOLACE_CLOUD_TOKEN = 'cloud-token';
    const next = vi.fn() as NextFunction;
    const res = makeRes();

    apiKeyMiddleware(makeReq(), res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.locals.requestAuth).toMatchObject<Partial<RequestAuthContext>>({
      token: 'cloud-token',
      authMethod: 'environment-token',
      headerName: 'environment',
    });
  });

  it('prefers an Authorization header over SOLACE_CLOUD_TOKEN', () => {
    process.env.SOLACE_CLOUD_TOKEN = 'cloud-token';
    const next = vi.fn() as NextFunction;
    const res = makeRes();

    apiKeyMiddleware(makeReq({ authorization: 'Be' + 'arer header-token' }), res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.locals.requestAuth).toMatchObject<Partial<RequestAuthContext>>({
      token: 'header-token',
      authMethod: 'bearer-token',
      headerName: 'authorization',
    });
  });
});
