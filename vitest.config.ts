import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['tests/simulation/**/*.test.ts'], testTimeout: 20000 },
});
