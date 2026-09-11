import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StatesService } from '@solace-labs/ep-openapi-node';
import { clearStateCache, resolveStateId } from '../lib/state.service';

vi.mock('@solace-labs/ep-openapi-node', () => ({
  StatesService: {
    getStates: vi.fn(),
  },
}));

const getStatesMock = vi.mocked(StatesService.getStates);

describe('resolveStateId()', () => {
  beforeEach(() => {
    clearStateCache();
  });
  it('resolves a lifecycle state name to its ID', async () => {
    getStatesMock.mockResolvedValueOnce({
      data: [
        { id: '1', name: 'Draft' },
        { id: '3', name: 'Deprecated' },
      ],
    });

    await expect(resolveStateId('Deprecated')).resolves.toBe('3');
  });

  it('throws when the lifecycle state is unknown', async () => {
    getStatesMock.mockResolvedValueOnce({
      data: [{ id: '1', name: 'Draft' }],
    });

    await expect(resolveStateId('Released')).rejects.toThrow('Lifecycle state not found');
  });
});
