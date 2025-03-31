import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // E2E tests configuration
    include: ['test/**/*.e2e-spec.ts'],
    environment: 'node',
    globals: true,
    root: '.',
  },
});
