import { unauthenticatedTest as test, expect } from '../../fixtures/test.fixture';
import { getAdminUser, getRegularUser } from '../../utils/testData';

test.describe('Login - Valid Credentials', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test('admin user can log in and is redirected to dashboard', async ({ loginPage, page }) => {
    const admin = getAdminUser();

    await test.step('Fill in admin credentials and submit', async () => {
      await loginPage.login(admin.email, admin.password);
    });

    await test.step('Verify redirect to dashboard', async () => {
      await page.waitForURL(/\/dashboard/);
      await expect(page).toHaveURL(/\/dashboard/);
    });

    await test.step('Verify welcome message is displayed', async () => {
      const welcomeMessage = page.getByTestId('welcome-message');
      await expect(welcomeMessage).toBeVisible();
      // Check welcome message contains "Welcome" (name may vary if profile tests run in parallel)
      await expect(welcomeMessage).toContainText('Welcome');
    });
  });

  test('regular user can log in and is redirected to dashboard', async ({ loginPage, page }) => {
    const user = getRegularUser();

    await test.step('Fill in user credentials and submit', async () => {
      await loginPage.login(user.email, user.password);
    });

    await test.step('Verify redirect to dashboard', async () => {
      await page.waitForURL(/\/dashboard/);
      await expect(page).toHaveURL(/\/dashboard/);
    });

    await test.step('Verify welcome message is displayed', async () => {
      const welcomeMessage = page.getByTestId('welcome-message');
      await expect(welcomeMessage).toBeVisible();
      // Check welcome message contains "Welcome" (name may vary if profile tests run in parallel)
      await expect(welcomeMessage).toContainText('Welcome');
    });
  });
});
