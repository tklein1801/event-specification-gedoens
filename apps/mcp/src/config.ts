import { getPort } from './lib/getPort';
import { getCurrentRuntime, type Runtime } from './lib/getCurrentRuntime';
import { type LogLevel, getLogLevel } from './lib/getLogLevel';
import 'dotenv/config';
import { name, version } from '../package.json';

export type Config = {
  service: typeof name;
  version: typeof version;
  port: ReturnType<typeof getPort>;
  runtime: Runtime;
  logLevel: LogLevel;
  tools: {
    allow_create: boolean;
    allow_update: boolean;
    allow_delete: boolean;
  };
};

export const config: Config = {
  service: name,
  version: version,
  port: getPort(3070),
  runtime: getCurrentRuntime(),
  logLevel: getLogLevel(process.env.LOG_LEVEL),
  tools: {
    allow_create: process.env.ALLOW_CREATE === 'true',
    allow_update: process.env.ALLOW_UPDATE === 'true',
    allow_delete: process.env.ALLOW_DELETE === 'true',
  },
};
