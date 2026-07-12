import { createLogger, format, transports } from 'winston';

const formats = {
  pretty: format.combine(format.splat(), format.simple()),
  json: format.combine(format.splat(), format.json()),
};

export const logger = createLogger({
  level: 'info',
  format: formats.pretty,
  transports: [new transports.Console()],
});
