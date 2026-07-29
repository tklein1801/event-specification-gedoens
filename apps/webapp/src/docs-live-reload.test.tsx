// @vitest-environment node

import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import config from '../vite.config';

describe('Vite documentation development setup', () => {
  it('allows Vite to watch the repository docs directory for HMR', () => {
    const workspaceRoot = fileURLToPath(new URL('../../..', import.meta.url));
    const docsDirectory = fileURLToPath(new URL('../../../docs', import.meta.url));
    expect(config.server?.fs?.allow).toEqual(
      expect.arrayContaining([workspaceRoot, docsDirectory]),
    );
  });
});
