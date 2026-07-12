import { Writable } from 'node:stream';
import { transports } from 'winston';
import { afterEach, describe, expect, it } from 'vitest';
import { logger } from '../../src/lib/logger';

function captureOutput(): string[] {
  const output: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      output.push(String(chunk).trim());
      callback();
    },
  });

  logger.clear();
  logger.add(new transports.Stream({ stream }));

  return output;
}

describe('logger', () => {
  afterEach(() => {
    logger.clear();
    logger.add(new transports.Console());
    logger.level = 'info';
  });

  it('is configured with info as its log level', () => {
    expect(logger.level).toBe('info');
  });

  it('writes pretty output', () => {
    const output = captureOutput();

    logger.info('schema loaded');

    expect(output).toEqual(['info: schema loaded']);
  });

  it('resolves message placeholders', () => {
    const output = captureOutput();

    logger.info('schema %s', 'loaded');

    expect(output).toEqual(['info: schema loaded']);
  });

  it('filters messages below the info level', () => {
    const output = captureOutput();

    logger.debug('not visible');

    expect(output).toHaveLength(0);
  });
});
