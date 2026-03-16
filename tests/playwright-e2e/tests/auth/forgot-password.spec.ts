import { unauthenticatedTest as test, expect } from '../../fixtures/test.fixture';

test.describe('Forgot Password', () => {
  test('user can submit forgot password form and see success message', async ({ loginPage, page }) => {
    await test.step('Navigate to login page', async () => {
      await loginPage.goto();
    });

    await test.step('Click forgot password link', async () => {
      await loginPage.clickForgotPassword();
      await expect(page).toHaveURL(/\/forgot-password/);
    });

    await test.step('Fill in email and submit', async () => {
      await page.getByTestId('email-input').fill('admin@example.com');

      const responsePromise = page.waitForResponse(
        (resp) => resp.url().includes('/api/users/forgot-password/') && resp.status() < 500
      );
      await page.getByTestId('submit-button').click();
      await responsePromise;
    });

    await test.step('Verify success message is shown', async () => {
      const successMessage = page.getByTestId('forgot-password-success');
      await expect(successMessage).toBeVisible();
    });
  });

  test('forgot password link is accessible from login page', async ({ loginPage }) => {
    await loginPage.goto();

    await expect(loginPage.forgotPasswordLink).toBeVisible();
    await expect(loginPage.forgotPasswordLink).toHaveAttribute('href', /forgot-password/);
  });
});
