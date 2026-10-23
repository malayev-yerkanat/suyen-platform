import { defineConfig, devices } from '@playwright/test';

const port = process.env.PLAYWRIGHT_PORT ?? '3000';
if (!/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
  throw new Error('PLAYWRIGHT_PORT must be a valid TCP port');
}
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL,
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
});
