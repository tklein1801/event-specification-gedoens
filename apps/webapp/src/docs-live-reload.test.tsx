// @vitest-environment node

import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import config, { docsHmrPlugin } from '../vite.config';

describe('Vite documentation development setup', () => {
  it('allows Vite to watch the repository docs directory for HMR', () => {
    const workspaceRoot = fileURLToPath(new URL('../../..', import.meta.url));
    const docsDirectory = fileURLToPath(new URL('../../../docs', import.meta.url));
    expect(config.server?.fs?.allow).toEqual(
      expect.arrayContaining([workspaceRoot, docsDirectory]),
    );

    const add = vi.fn();
    docsHmrPlugin().configureServer({ watcher: { add } });
    expect(add).toHaveBeenCalledWith(docsDirectory);
  });
});
