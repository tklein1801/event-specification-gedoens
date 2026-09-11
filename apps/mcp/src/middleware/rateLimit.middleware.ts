import type { NextFunction, Request, Response } from 'express';
import { config } from '../appConfig';
import { logger } from '../lib/logger';

type Counter = {
  startedAt: number;
  count: number;
};

const requestCounts = new Map<string, Counter>();

const SWEEP_INTERVAL_MS = 60_000;
const MAX_TRACKED_CLIENTS = 10_000;

let lastSweepAt = 0;

function getClientKey(req: Request): string {
  return req.ip || 'unknown';
}

function evictExpiredCounters(now: number): void {
  if (requestCounts.size < MAX_TRACKED_CLIENTS && now - lastSweepAt < SWEEP_INTERVAL_MS) {
    return;
  }

  lastSweepAt = now;
  for (const [key, counter] of requestCounts) {
    if (now - counter.startedAt >= config.rateLimit.windowMs) {
      requestCounts.delete(key);
    }
  }
}

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  const now = Date.now();
  evictExpiredCounters(now);

  const { windowMs, maxRequests } = config.rateLimit;
  const key = getClientKey(req);
  const existingCounter = requestCounts.get(key);

  if (!existingCounter || now - existingCounter.startedAt >= windowMs) {
    requestCounts.set(key, { startedAt: now, count: 1 });
    next();
    return;
  }

  existingCounter.count += 1;
  if (existingCounter.count <= maxRequests) {
    next();
    return;
  }

  const retryAfterSeconds = Math.ceil((windowMs - (now - existingCounter.startedAt)) / 1000);
  res.setHeader('Retry-After', String(retryAfterSeconds));
  logger.warn('Request rate-limited', {
    ip: req.ip,
    method: req.method,
    url: req.originalUrl,
    maxRequestsPerWindow: maxRequests,
    windowMs,
  });
  res.status(429).json({ error: 'Too many requests. Please try again later.' });
}
