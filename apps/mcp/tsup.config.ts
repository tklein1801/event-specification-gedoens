import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    server: 'src/server.ts',
    cli: 'src/cli.ts',
  },
  format: ['cjs'],
  platform: 'node',
  target: 'node20',
  bundle: true,
  splitting: false,
  sourcemap: false,
  clean: true,
  noExternal: ['@event-specification-gedoens/migration-core'],
});
