import { test, expect } from '../../fixtures/test.fixture';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  test('displays welcome message with user name', async ({ dashboardPage }) => {
    await test.step('Verify welcome message is visible', async () => {
      const welcomeText = await dashboardPage.getWelcomeText();
      expect(welcomeText).toBeTruthy();
      expect.soft(welcomeText.toLowerCase()).toContain('welcome');
    });
  });

  test('displays dashboard stats', async ({ dashboardPage }) => {
    await test.step('Verify stats section is visible', async () => {
      await expect(dashboardPage.statsSection).toBeVisible();
    });

    await test.step('Verify total items count is displayed', async () => {
      const totalItems = await dashboardPage.getTotalItemsCount();
      expect.soft(totalItems).toBeTruthy();
    });

    await test.step('Verify user role is displayed', async () => {
      const role = await dashboardPage.getUserRoleDisplay();
      expect.soft(role).toBeTruthy();
    });
  });

  test('displays quick links for navigation', async ({ dashboardPage }) => {
    await test.step('Verify quick links section is visible', async () => {
      const isVisible = await dashboardPage.isQuickLinksVisible();
      expect(isVisible).toBeTruthy();
    });

    await test.step('Verify items link navigates correctly', async () => {
      await dashboardPage.clickViewItems();
      await expect(dashboardPage.page).toHaveURL(/\/items/);
    });
  });

  test('navbar displays user role', async ({ dashboardPage }) => {
    await test.step('Verify user role is shown in navbar', async () => {
      const role = await dashboardPage.getUserRole();
      expect(role).toBeTruthy();
    });
  });

  test('can navigate to profile from dashboard', async ({ dashboardPage }) => {
    await test.step('Click profile link', async () => {
      await dashboardPage.clickViewProfile();
    });

    await test.step('Verify navigation to profile page', async () => {
      await expect(dashboardPage.page).toHaveURL(/\/profile/);
    });
  });
});
