import 'dotenv/config';

import { type Runtime, getCurrentRuntime } from './getCurrentRuntime';
import { getLogLevel, type LogLevel } from './getLogLevel';
import { getPort } from './getPort';

export class Config {
  private _serviceName: string;
  private _serviceVersion: string;
  private _port: ReturnType<typeof getPort>;
  private _runtime: Runtime;
  private _logLevel: LogLevel;
  private _tools: {
    allow_create: boolean;
    allow_update: boolean;
    allow_delete: boolean;
  };

  constructor(serviceName: string, version: string) {
    this._serviceName = serviceName;
    this._serviceVersion = version;
    this._port = getPort(3070);
    this._runtime = getCurrentRuntime();
    this._logLevel = getLogLevel(process.env.LOG_LEVEL);
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
}
