import { unauthenticatedTest as test, expect } from '../../fixtures/test.fixture';

test.describe('Login - Invalid Credentials', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test('shows error with wrong password', async ({ loginPage }) => {
    await test.step('Submit login with wrong password', async () => {
      await loginPage.login('admin@example.com', 'WrongPassword123!');
    });

    await test.step('Verify error message is displayed', async () => {
      const errorText = await loginPage.getErrorMessage();
      expect(errorText).toBeTruthy();
      expect.soft(errorText.toLowerCase()).toContain('invalid');
    });
  });

  test('shows error with empty fields', async ({ loginPage, page }) => {
    await test.step('Click submit without filling any fields', async () => {
      await loginPage.submitButton.click();
    });

    await test.step('Verify user stays on login page', async () => {
      await expect(page).toHaveURL(/\/login/);
    });

    await test.step('Verify validation or error is shown', async () => {
      // The form uses custom JS validation - shows error for empty fields
      const errorText = await loginPage.getErrorMessage();
      expect(errorText).toBeTruthy();
      expect(errorText.toLowerCase()).toContain('please enter');
    });
  });

  test('shows error for non-existent user', async ({ loginPage }) => {
    await test.step('Submit login with non-existent email', async () => {
      await loginPage.login('nonexistent@example.com', 'SomePassword123!');
    });

    await test.step('Verify error message is displayed', async () => {
      const errorText = await loginPage.getErrorMessage();
      expect(errorText).toBeTruthy();
    });
  });

  test('password field masks input', async ({ loginPage }) => {
    await test.step('Verify password input type is password', async () => {
      const inputType = await loginPage.passwordInput.getAttribute('type');
      expect(inputType).toBe('password');
    });
  });
});
