import { describe, expect, it } from 'vitest';
import { runExclusive } from '../lib/requestMutex';

describe('runExclusive', () => {
  it('runs tasks strictly in submission order', async () => {
    const order: number[] = [];
    const task = (id: number, delay: number) => async () => {
      await new Promise((resolve) => setTimeout(resolve, delay));
      order.push(id);
    };

    await Promise.all([
      runExclusive(task(1, 20)),
      runExclusive(task(2, 0)),
      runExclusive(task(3, 5)),
    ]);

    expect(order).toEqual([1, 2, 3]);
  });

  it('keeps executing after a task fails', async () => {
    const order: string[] = [];

    await expect(
      runExclusive(async () => {
        order.push('fail');
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    await runExclusive(async () => {
      order.push('after');
    });

    expect(order).toEqual(['fail', 'after']);
  });
});
