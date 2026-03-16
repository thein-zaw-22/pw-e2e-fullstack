/**
 * Auth setup fixtures.
 * These run before all tests to create saved authentication states.
 * This way, tests don't need to log in through the UI every time.
 */
import { test as setup, expect } from '@playwright/test';
import { getEnv } from '../utils/env';

const env = getEnv();

/**
 * Helper function to log in and save the browser's storage state.
 * Storage state includes cookies and localStorage, so future tests
 * can start already logged in.
 */
async function loginAndSaveState(page: any, email: string, password: string, savePath: string) {
  await page.goto('/login');
  await page.getByTestId('email-input').fill(email);
  await page.getByTestId('password-input').fill(password);

  // Wait for the login API to respond before continuing
  const responsePromise = page.waitForResponse(
    (resp: any) => resp.url().includes('/api/users/login/') && resp.status() === 200
  );
  await page.getByTestId('login-button').click();
  await responsePromise;

  // Verify we landed on the dashboard
  await page.waitForURL(/\/dashboard/);
  await expect(page).toHaveURL(/\/dashboard/);

  // Save the browser state (cookies + localStorage) to a file
  await page.context().storageState({ path: savePath });
}

// Set up admin authentication state
setup('authenticate as admin', async ({ page }) => {
  await loginAndSaveState(page, env.ADMIN_EMAIL, env.ADMIN_PASSWORD, 'playwright/.auth/admin.json');
});

// Set up regular user authentication state
setup('authenticate as regular user', async ({ page }) => {
  await loginAndSaveState(page, env.USER_EMAIL, env.USER_PASSWORD, 'playwright/.auth/user.json');
});
