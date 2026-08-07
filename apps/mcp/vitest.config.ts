import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    name: 'mcp-service',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/__tests__/**/*.test.ts'],
    exclude: ['**/build/**', '**/node_modules/**'],
    clearMocks: true,
    restoreMocks: true,
    passWithNoTests: true,
  },
});
