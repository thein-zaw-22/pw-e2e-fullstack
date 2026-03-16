/**
 * Playwright configuration file.
 *
 * Key settings:
 * - baseURL: Where the frontend is running
 * - retries: More retries in CI to handle flakiness
 * - trace/screenshot/video: Captured on failure for debugging
 * - projects: Run tests across Chromium, Firefox, and WebKit
 * - setup project: Handles login and saves auth state before tests run
 */
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '.env') });

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

export default defineConfig({
  // Where to find test files
  testDir: '.',
  // Run tests in parallel for speed
  fullyParallel: true,
  // Fail the build if test.only is left in CI
  forbidOnly: !!process.env.CI,
  // Retry failed tests (more retries in CI)
  retries: process.env.CI ? 2 : 1,
  // Number of parallel workers
  workers: process.env.CI ? 2 : 4,
  // Max time per test
  timeout: 60_000,
  // Max time for each expect() assertion
  expect: {
    timeout: 10_000,
  },

  // Reporters: HTML for viewing results, list for terminal output
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
    ...(process.env.CI ? [['github' as const]] : []),
  ],

  // Shared settings for all projects
  use: {
    baseURL: BASE_URL,
    // Capture trace on first retry of a failed test (for debugging)
    trace: 'on-first-retry',
    // Take screenshot when a test fails
    screenshot: 'only-on-failure',
    // Record video on first retry
    video: 'on-first-retry',
    // Max time for individual actions like click, fill, etc.
    actionTimeout: 15_000,
    // Max time for page navigation
    navigationTimeout: 30_000,
  },

  projects: [
    // Setup project: logs in and saves auth state to disk
    // Other projects depend on this and run after it completes
    {
      name: 'setup',
      testMatch: /fixtures\/auth\.fixture\.ts/,
    },

    // Chromium (Chrome/Edge) browser tests
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Reuse the saved admin auth state so tests start logged in
        storageState: 'playwright/.auth/admin.json',
      },
      testDir: './tests',
      dependencies: ['setup'],
    },

    // Firefox browser tests
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'playwright/.auth/admin.json',
      },
      testDir: './tests',
      dependencies: ['setup'],
    },

    // WebKit (Safari) browser tests
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: 'playwright/.auth/admin.json',
      },
      testDir: './tests',
      dependencies: ['setup'],
    },
  ],

  // Optional: tell Playwright where the app is running
  // Since we use Docker Compose, the app should already be running
  webServer: {
    command: 'echo "Ensure Docker Compose services are running"',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
