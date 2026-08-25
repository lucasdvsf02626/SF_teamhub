import { defineConfig } from 'vitest/config';


export default defineConfig({
  resolve: {
    alias: { '@': new URL('./src', import.meta.url).pathname },
  },
  test: {
    // Node environment is enough: these cover pure logic, not components.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
