import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**', // E2EテストはPlaywrightで実行
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*'
    ],
  },
});
