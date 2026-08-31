import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';


export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@sf/core': fileURLToPath(new URL('./packages/core/src/index.ts', import.meta.url)),
    },
  },
  test: {
    // Node environment is enough: these cover pure logic, not components.
    environment: 'node',
    include: ['src/**/*.test.ts', 'packages/**/*.test.ts'],
  },
});
