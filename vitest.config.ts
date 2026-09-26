import { defineConfig } from 'vitest/config';

// Lead-owned (CONTRACTS §0). Scoped deliberately: the only testable code in this
// repo is pure TypeScript (lib/ helpers, scripts/content pipeline steps). React
// Native / JSX files are verified by `npm run typecheck` and `npm run bundle`
// instead, so vitest never has to parse them.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/__tests__/**/*.test.ts', 'scripts/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**', '.expo-bundle-check/**'],
  },
});
