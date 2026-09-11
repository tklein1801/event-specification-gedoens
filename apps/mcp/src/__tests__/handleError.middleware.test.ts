import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { handleError } from '../middleware/handleError.middleware';

function makeRes(): Response {
  const res = { status: vi.fn(), json: vi.fn() } as unknown as Response;
  (res.status as ReturnType<typeof vi.fn>).mockReturnValue(res);
  return res;
}

const request = { method: 'POST', originalUrl: '/mcp' } as Request;
const next = vi.fn() as NextFunction;

describe('handleError', () => {
  it('passes through client error status codes', () => {
    const error = Object.assign(new Error('Unexpected token in JSON'), { status: 400 });
    const res = makeRes();

    handleError(error, request, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Unexpected token in JSON' }),
    );
  });

  it('masks server errors behind a generic message', () => {
    const error = new Error('database exploded');
    const res = makeRes();

    handleError(error, request, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Internal Server Error' }),
    );
  });
});
