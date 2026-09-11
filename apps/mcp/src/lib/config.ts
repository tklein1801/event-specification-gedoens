import 'dotenv/config';

import { name as packageName, version as versionName } from '../../package.json';
import { type Runtime, getCurrentRuntime } from './getCurrentRuntime';
import { getLogLevel, type LogLevel } from './getLogLevel';
import { getPort } from './getPort';

function getPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getTrustProxy(): boolean | number | string {
  const value = process.env.TRUST_PROXY?.trim();
  if (!value) return false;
  if (value === 'true') return true;
  if (value === 'false') return false;

  const numeric = Number(value);
  return Number.isInteger(numeric) ? numeric : value;
}

function getCorsOrigin(): string[] | undefined {
  const value = process.env.CORS_ORIGIN?.trim();
  if (!value || value === '*') return undefined;

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export class Config {
  private _serviceName: string;
  private _serviceVersion: string;
  private _port: ReturnType<typeof getPort>;
  private _runtime: Runtime;
  private _logLevel: LogLevel;
  private _trustProxy: boolean | number | string;
  private _corsOrigin: string[] | undefined;
  private _bodyLimit: string;
  private _rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  private _tools: {
    allow_create: boolean;
    allow_update: boolean;
    allow_delete: boolean;
  };

  constructor() {
    this._serviceName = packageName;
    this._serviceVersion = versionName;
    this._port = getPort(3070);
    this._runtime = getCurrentRuntime();
    this._logLevel = getLogLevel(process.env.LOG_LEVEL);
    this._trustProxy = getTrustProxy();
    this._corsOrigin = getCorsOrigin();
    this._bodyLimit = process.env.BODY_LIMIT?.trim() || '5mb';
    this._rateLimit = {
      windowMs: getPositiveInt(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
      maxRequests: getPositiveInt(process.env.RATE_LIMIT_MAX, 120),
    };
    this._tools = {
      allow_create: process.env.ALLOW_CREATE === 'true',
      allow_update: process.env.ALLOW_UPDATE === 'true',
      allow_delete: process.env.ALLOW_DELETE === 'true',
    };
  }

  get service() {
    return this._serviceName;
  }

  get version() {
    return this._serviceVersion;
  }

  get port() {
    return this._port;
  }

  get runtime() {
    return this._runtime;
  }

  get logLevel() {
    return this._logLevel;
  }

  get tools() {
    return this._tools;
  }

  get trustProxy() {
    return this._trustProxy;
  }

  get corsOrigin() {
    return this._corsOrigin;
  }

  get bodyLimit() {
    return this._bodyLimit;
  }

  get rateLimit() {
    return this._rateLimit;
  }

  setPort(port: number) {
    this._port = port;
  }

  setLogLevel(logLevel: LogLevel) {
    this._logLevel = logLevel;
  }

  enableTools({
    allow_create,
    allow_update,
    allow_delete,
  }: {
    allow_create?: boolean;
    allow_update?: boolean;
    allow_delete?: boolean;
  }) {
    if (allow_create !== undefined) {
      this._tools.allow_create = allow_create;
    }
    if (allow_update !== undefined) {
      this._tools.allow_update = allow_update;
    }
    if (allow_delete !== undefined) {
      this._tools.allow_delete = allow_delete;
    }
  }
}
