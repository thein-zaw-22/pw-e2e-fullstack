import { unauthenticatedTest as test, expect } from '../../fixtures/test.fixture';
import { getAdminUser } from '../../utils/testData';

test.describe('Smoke Tests @smoke', { tag: '@smoke' }, () => {
  test('complete user journey: login, dashboard, items, logout', async ({
    loginPage,
    dashboardPage,
    itemsPage,
    page,
  }) => {
    const admin = getAdminUser();

    await test.step('Login as admin', async () => {
      await loginPage.goto();
      await loginPage.loginAndWaitForDashboard(admin.email, admin.password);
      await expect(page).toHaveURL(/\/dashboard/);
    });

    await test.step('Verify dashboard loads with welcome message', async () => {
      const welcomeText = await dashboardPage.getWelcomeText();
      expect(welcomeText).toBeTruthy();
    });

    await test.step('Navigate to items page', async () => {
      await dashboardPage.navbar.itemsLink.click();
      await page.waitForURL(/\/items/);
      await expect(itemsPage.itemsList.or(itemsPage.noResultsMessage)).toBeVisible();
    });

    await test.step('Verify items page is functional', async () => {
      await expect(itemsPage.searchInput).toBeVisible();
    });

    await test.step('Logout', async () => {
      await dashboardPage.logout();
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test('login page renders correctly @smoke', { tag: '@smoke' }, async ({ loginPage }) => {
    await test.step('Navigate to login page', async () => {
      await loginPage.goto();
    });

    await test.step('Verify all login form elements are present', async () => {
      await expect(loginPage.emailInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(loginPage.submitButton).toBeVisible();
      await expect(loginPage.forgotPasswordLink).toBeVisible();
    });
  });

  test('unauthenticated user is redirected to login @smoke', { tag: '@smoke' }, async ({ page }) => {
    await test.step('Attempt to visit protected page', async () => {
      await page.goto('/dashboard');
    });

    await test.step('Verify redirect to login', async () => {
      await expect(page).toHaveURL(/\/login/);
    });
  });
});
