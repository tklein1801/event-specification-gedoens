import { createLogger, format, transports } from 'winston';
import { EpSdkConsoleLogger, EEpSdkLogLevel } from '@solace-labs/ep-sdk';
import { config } from '../config';
import { type LogLevel } from './getLogLevel';

const formats = {
  pretty: format.combine(format.splat(), format.simple()),
  json: format.combine(format.splat(), format.json()),
};

export const logger = createLogger({
  level: config.logLevel,
  format: formats.pretty,
  transports: [new transports.Console()],
});

export const eventPortalLogger = new EpSdkConsoleLogger(
  config.service,
  maptoEpSdkLogLevel(config.logLevel),
);

export function maptoEpSdkLogLevel(level: LogLevel): EEpSdkLogLevel {
  switch (level) {
    case 'crit':
      return EEpSdkLogLevel.Debug;
    case 'debug':
      return EEpSdkLogLevel.Debug;
    default:
    case 'info':
      return EEpSdkLogLevel.Info;
    case 'warn':
      return EEpSdkLogLevel.Warn;
    case 'error':
      return EEpSdkLogLevel.Error;
    case 'silent':
      return EEpSdkLogLevel.Silent;
  }
}
