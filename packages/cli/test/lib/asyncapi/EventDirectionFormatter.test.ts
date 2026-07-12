import { describe, expect, it, vi } from 'vitest';
import { EventDirectionFormatter } from '../../../src/lib/asyncapi/EventDirectionFormatter';

describe('EventDirectionFormatter', () => {
  it('uses separate highlighting for published and consumed events', () => {
    const published = vi.fn((text: string) => `<green-bold>${text}</green-bold>`);
    const consumed = vi.fn((text: string) => `<yellow-bold>${text}</yellow-bold>`);
    const formatter = new EventDirectionFormatter({ published, consumed });

    expect(formatter.format('published')).toBe('<green-bold>PUB</green-bold>');
    expect(formatter.format('consumed')).toBe('<yellow-bold>SUB</yellow-bold>');
    expect(published).toHaveBeenCalledWith('PUB');
    expect(consumed).toHaveBeenCalledWith('SUB');
  });
});
