import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/utils/e2e-setup.ts'],
    testTimeout: 600000, // 10分タイムアウト（動画生成まで時間がかかるため）
    hookTimeout: 60000,  // 1分（ログイン処理用）
    include: ['tests/e2e/**/*.test.ts'],
    exclude: ['tests/unit/**/*', 'tests/integration/**/*'],
    reporters: ['verbose'],
    // E2Eテストは並行実行しない（リソース競合を避けるため）
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})