import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://localhost:8787';

export default defineConfig({
  testDir: 'tests/e2e',
  use: { baseURL },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'npm run build && npx wrangler dev --port 8787',
        url: 'http://localhost:8787',
        reuseExistingServer: true,
        timeout: 180_000,
        env: { WRANGLER_SEND_METRICS: 'false' },
      },
});
