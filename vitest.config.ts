import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@balloons/domain': path.join(root, 'packages/domain/src/index.ts'),
      '@balloons/memory': path.join(root, 'packages/memory/src/index.ts'),
      '@balloons/browser': path.join(root, 'packages/browser/src/index.ts'),
    },
  },
  test: {
    include: ['apps/**/*.test.ts', 'packages/**/*.test.ts'],
    environment: 'node',
  },
});
