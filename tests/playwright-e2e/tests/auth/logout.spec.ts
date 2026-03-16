import { test, expect } from '../../fixtures/test.fixture';

test.describe('Logout', () => {
  test('user can log out and is redirected to login page', async ({ dashboardPage, page }) => {
    await test.step('Navigate to dashboard', async () => {
      await dashboardPage.goto();
      await expect(page).toHaveURL(/\/dashboard/);
    });

    await test.step('Click logout button', async () => {
      await dashboardPage.logout();
    });

    await test.step('Verify redirect to login page', async () => {
      await expect(page).toHaveURL(/\/login/);
    });

    await test.step('Verify cannot access dashboard without auth', async () => {
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/login/);
    });
  });
});
