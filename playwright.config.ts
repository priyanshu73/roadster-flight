import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  // Software WebGL can advance simulation more slowly than wall-clock time.
  // Keep behaviour thresholds strict; allow time for their state to be observed.
  timeout: 60000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4173/roadster-flight/',
    viewport: { width: 1440, height: 900 },
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/roadster-flight/',
    reuseExistingServer: !process.env.CI,
  },
});
