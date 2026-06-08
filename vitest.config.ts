import { defineConfig } from 'vitest/config';

// The coach engine is pure TypeScript (no React Native imports), so tests run
// in a plain Node environment with zero native mocking. Scope to src/** so the
// runner never tries to load RN screens or native modules.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
