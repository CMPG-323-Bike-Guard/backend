import { defineConfig } from 'vitest/config';

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/bikeguard_test';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['tests/global-setup.ts'],
    fileParallelism: false,
    testTimeout: 15000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: testDatabaseUrl,
      HMAC_SECRET: 'test-hmac-secret',
      JWT_SECRET: 'test-jwt-secret',
      GATE_MASTER_SECRET: 'test-gate-secret',
      GATE_SIGNING_REQUIRED: 'true',
      SCAN_DEBOUNCE_MS: '3000',
      LOGIN_RATE_LIMIT_MAX: '3',
    },
  },
});