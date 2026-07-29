import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const workspaceRoot = fileURLToPath(new URL('../..', import.meta.url));
const docsDirectory = fileURLToPath(new URL('../../docs', import.meta.url));

export function docsHmrPlugin() {
  return {
    name: 'watch-repository-docs',
    configureServer(server: { watcher: { add: (path: string) => unknown } }) {
      server.watcher.add(docsDirectory);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), docsHmrPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    fs: {
      allow: [workspaceRoot, docsDirectory],
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.tsx'],
    setupFiles: ['./src/test/setup.ts'],
    clearMocks: true,
    restoreMocks: true,
  },
});
