import { defineConfig, devices } from '@playwright/test';

// Synthetic credentials belong only to the loopback fixture, never a real project.
process.env.TEST_DEMO_EMAIL = 'fixture@suyen.example';
process.env.TEST_DEMO_PASSWORD = 'fixture-password';

export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: { baseURL: 'http://127.0.0.1:3107', ...devices['Desktop Chrome'] },
  webServer: [
    { command: 'node tests/fixtures/supabase-server.mjs', url: 'http://127.0.0.1:54329/health', reuseExistingServer: false },
    {
      command: 'npm run dev -- --webpack --hostname 127.0.0.1 --port 3107',
      url: 'http://127.0.0.1:3107', reuseExistingServer: false,
      env: { NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54329', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'fixture-public-key' },
    },
  ],
});
