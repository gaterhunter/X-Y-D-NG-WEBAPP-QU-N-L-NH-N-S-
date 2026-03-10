import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'list' : 'html',
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],

  // Trên CI: workflow tự khởi động servers → không cần webServer
  // Trên local: Playwright tự khởi động cả 2 server
  webServer: process.env.CI
    ? undefined
    : [
        {
          command: 'node ../backend/server.js',
          port: 5000,
          reuseExistingServer: true,
        },
        {
          command: 'npm run dev',
          port: 3000,
          reuseExistingServer: true,
        },
      ],
});
