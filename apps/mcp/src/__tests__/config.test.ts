import { afterEach, describe, expect, it } from 'vitest';
import { Config } from '../lib/config';

const ENV_KEYS = [
  'TRUST_PROXY',
  'CORS_ORIGIN',
  'BODY_LIMIT',
  'RATE_LIMIT_WINDOW_MS',
  'RATE_LIMIT_MAX',
] as const;

afterEach(() => {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
});

describe('Config', () => {
  it('parses the hardening environment variables', () => {
    process.env.TRUST_PROXY = '2';
    process.env.CORS_ORIGIN = 'https://a.example.com, https://b.example.com';
    process.env.BODY_LIMIT = '10mb';
    process.env.RATE_LIMIT_WINDOW_MS = '30000';
    process.env.RATE_LIMIT_MAX = '50';

    const config = new Config();

    expect(config.trustProxy).toBe(2);
    expect(config.corsOrigin).toEqual(['https://a.example.com', 'https://b.example.com']);
    expect(config.bodyLimit).toBe('10mb');
    expect(config.rateLimit).toEqual({ windowMs: 30000, maxRequests: 50 });
  });

  it('falls back to safe defaults', () => {
    const config = new Config();

    expect(config.trustProxy).toBe(false);
    expect(config.corsOrigin).toBeUndefined();
    expect(config.bodyLimit).toBe('5mb');
    expect(config.rateLimit).toEqual({ windowMs: 60000, maxRequests: 120 });
  });
});
