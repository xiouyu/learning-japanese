import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import stepsSplit from './build/steps-split';

export default defineConfig({
  plugins: [stepsSplit(fileURLToPath(new URL('./src/data/steps.json', import.meta.url)))],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['test/**/*.test.ts'],
  },
});
