import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the iktissad-redesign E2E smoke suite.
 *
 * - Chromium only (multi-browser coverage is overkill for smoke).
 * - Runs against a `next dev` server on http://localhost:3000 by default.
 * - Override the target with PLAYWRIGHT_BASE_URL=https://staging.example.com.
 * - When PLAYWRIGHT_SKIP_WEBSERVER=1, assume a server is already running
 *   (handy for CI matrices that boot the app separately).
 */

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === '1';

/**
 * Placeholder Supabase config so `npm run dev` can boot in a clean checkout.
 * Pages that fetch real data will render empty states or graceful error UI
 * (which the smoke suite tolerates). Set NEXT_PUBLIC_SUPABASE_URL +
 * NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment to hit a real DB instead.
 */
const webServerEnv: Record<string, string> = {
  ...process.env as Record<string, string>,
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24ifQ.placeholder',
  SUPABASE_SERVICE_ROLE_KEY:
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSJ9.placeholder',
};

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }], ['github']]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    locale: 'ar-SA',
    timezoneId: 'Asia/Riyadh',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  ...(skipWebServer
    ? {}
    : {
        webServer: {
          command: 'npm run dev',
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
          stdout: 'pipe',
          stderr: 'pipe',
          env: webServerEnv,
        },
      }),
});
