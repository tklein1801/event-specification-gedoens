import { afterEach, describe, expect, it, vi } from 'vitest';
import { log } from '../../../src/lib/decorators/log.decorator';
import { logger } from '../../../src/lib/logger';

describe('log decorator', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs method arguments and the return value at debug level', () => {
    const debug = vi.spyOn(logger, 'debug');

    class Calculator {
      @log
      add(left: number, right: number): number {
        return left + right;
      }
    }

    const result = new Calculator().add(2, 3);

    expect(result).toBe(5);
    expect(debug).toHaveBeenNthCalledWith(1, '-> Calling %s with %o', 'add', [2, 3]);
    expect(debug).toHaveBeenNthCalledWith(2, '<- %s returned %o', 'add', 5);
  });

  it('preserves the method context', () => {
    class Counter {
      constructor(private readonly value: number) {}

      @log
      increment(by: number): number {
        return this.value + by;
      }
    }

    expect(new Counter(4).increment(2)).toBe(6);
  });

  it('does not swallow errors thrown by the decorated method', () => {
    const debug = vi.spyOn(logger, 'debug');

    class BrokenOperation {
      @log
      run(): never {
        throw new Error('failed');
      }
    }

    expect(() => new BrokenOperation().run()).toThrow('failed');
    expect(debug).toHaveBeenCalledOnce();
    expect(debug).toHaveBeenCalledWith('-> Calling %s with %o', 'run', []);
  });
});
