import { defineConfig, devices } from '@playwright/test';

// Synthetic credentials belong only to the loopback fixture, never a real database.
process.env.TEST_DEMO_EMAIL = 'fixture@suyen.example';
process.env.TEST_DEMO_PASSWORD = 'fixture-password';

export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: { baseURL: 'http://127.0.0.1:3107', ...devices['Desktop Chrome'] },
  webServer: [
    { command: 'npx tsx tests/fixtures/db-server.ts', url: 'http://127.0.0.1:54329/health', reuseExistingServer: false, timeout: 120_000 },
    {
      command: 'npm run dev -- --webpack --hostname 127.0.0.1 --port 3107',
      url: 'http://127.0.0.1:3107', reuseExistingServer: false,
      env: {
        DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:54330/postgres',
        BETTER_AUTH_SECRET: 'fixture-secret-that-is-at-least-thirty-two-chars',
        BETTER_AUTH_URL: 'http://127.0.0.1:3107',
      },
    },
  ],
});
