import { unauthenticatedTest as test, expect } from '../../fixtures/test.fixture';
import { getAdminUser, getRegularUser } from '../../utils/testData';
import { randomItemName, randomDescription, randomPrice, randomCategory, randomName } from '../../utils/randomData';
import { ApiClient } from '../../utils/apiClient';
import { getEnv } from '../../utils/env';

test.describe('Regression Tests @regression', { tag: '@regression' }, () => {
  test('admin full CRUD flow: login, create item, edit item, delete item, logout', async ({
    loginPage,
    page,
    playwright,
  }) => {
    const admin = getAdminUser();
    const env = getEnv();
    const itemName = randomItemName();
    const updatedName = randomItemName();
    let createdItemId: number | undefined;

    // Setup API client for cleanup
    const apiContext = await playwright.request.newContext({ baseURL: env.API_BASE_URL });
    const apiClient = new ApiClient(apiContext);
    await apiClient.authenticate(admin.email, admin.password);

    try {
      await test.step('Login as admin', async () => {
        await loginPage.goto();
        await loginPage.loginAndWaitForDashboard(admin.email, admin.password);
        await expect(page).toHaveURL(/\/dashboard/);
      });

      await test.step('Navigate to items and create a new item', async () => {
        await page.goto('/items/create');
        await page.getByTestId('item-name-input').fill(itemName);
        await page.getByTestId('item-description-input').fill(randomDescription());
        await page.getByTestId('item-category-select').selectOption(randomCategory());
        await page.getByTestId('item-price-input').fill(randomPrice());

        const responsePromise = page.waitForResponse(
          (resp) => resp.url().includes('/api/items') && resp.status() < 500
        );
        await page.getByTestId('submit-item-button').click();
        const response = await responsePromise;

        if (response.ok()) {
          const body = await response.json();
          createdItemId = body.id;
        }

        await page.waitForURL(/\/items/);
      });

      await test.step('Verify item appears in the list', async () => {
        await page.goto('/items');
        await page.getByTestId('search-input').fill(itemName);
        await page.getByTestId('search-button').click();
        await page.waitForResponse(
          (resp) => resp.url().includes('/api/items') && resp.status() === 200
        );
        await expect(
          page.getByTestId(`item-row-${itemName}`).or(page.locator(`[data-item-name="${itemName}"]`))
        ).toBeVisible();
      });

      await test.step('Edit the item', async () => {
        if (createdItemId) {
          await page.goto(`/items/${createdItemId}/edit`);
        } else {
          const itemRow = page.getByTestId(`item-row-${itemName}`).or(
            page.locator(`[data-item-name="${itemName}"]`)
          );
          await itemRow.getByRole('button', { name: /edit/i }).click();
          await page.waitForURL(/\/items\/\d+\/edit/);
        }

        await page.getByTestId('item-name-input').clear();
        await page.getByTestId('item-name-input').fill(updatedName);

        const updateResponse = page.waitForResponse(
          (resp) => resp.url().includes('/api/items/') && resp.status() < 500
        );
        await page.getByTestId('submit-item-button').click();
        await updateResponse;
        await page.waitForURL(/\/items/);
      });

      await test.step('Verify edit was saved', async () => {
        await page.goto('/items');
        await page.getByTestId('search-input').fill(updatedName);
        await page.getByTestId('search-button').click();
        await page.waitForResponse(
          (resp) => resp.url().includes('/api/items') && resp.status() === 200
        );
        await expect(
          page.getByTestId(`item-row-${updatedName}`).or(page.locator(`[data-item-name="${updatedName}"]`))
        ).toBeVisible();
      });

      await test.step('Delete the item', async () => {
        const itemRow = page.getByTestId(`item-row-${updatedName}`).or(
          page.locator(`[data-item-name="${updatedName}"]`)
        );
        await itemRow.getByRole('button', { name: /delete/i }).click();

        await page.getByTestId('confirm-dialog').waitFor({ state: 'visible' });
        const deleteResponse = page.waitForResponse(
          (resp) => resp.url().includes('/api/items/') && resp.request().method() === 'DELETE'
        );
        await page.getByTestId('dialog-confirm').click();
        await deleteResponse;

        await expect(itemRow).toBeHidden();
        createdItemId = undefined; // Already deleted
      });

      await test.step('Logout', async () => {
        await page.getByRole('button', { name: /logout/i }).click();
        await page.waitForURL(/\/login/);
        await expect(page).toHaveURL(/\/login/);
      });
    } finally {
      // Cleanup if item was not deleted during test
      if (createdItemId) {
        await apiClient.safeDeleteItem(createdItemId);
      }
      await apiContext.dispose();
    }
  });

  test('regular user can view but not modify items', async ({ loginPage, page }) => {
    const user = getRegularUser();

    await test.step('Login as regular user', async () => {
      await loginPage.goto();
      await loginPage.loginAndWaitForDashboard(user.email, user.password);
    });

    await test.step('Navigate to items page', async () => {
      await page.goto('/items');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Verify no create/edit/delete buttons', async () => {
      const createButton = page.getByTestId('create-item-button');
      const editButtons = page.getByRole('button', { name: /edit/i });
      const deleteButtons = page.getByRole('button', { name: /delete/i });

      expect.soft(await createButton.count()).toBe(0);
      expect.soft(await editButtons.count()).toBe(0);
      expect.soft(await deleteButtons.count()).toBe(0);
    });

    await test.step('Verify search still works', async () => {
      const searchInput = page.getByTestId('search-input');
      await expect(searchInput).toBeVisible();
    });
  });

  test('profile update persists across page reloads @regression', { tag: '@regression' }, async ({
    loginPage,
    page,
    playwright,
  }) => {
    // Use regular user to avoid conflicts with profile tests that modify admin
    const user = getRegularUser();
    const env = getEnv();
    const newName = randomName();

    // Get original name for restore
    const apiContext = await playwright.request.newContext({ baseURL: env.API_BASE_URL });
    const apiClient = new ApiClient(apiContext);
    await apiClient.authenticate(user.email, user.password);
    const profile = await apiClient.getProfile();
    const originalName = (profile.first_name as string) || '';

    try {
      await test.step('Login as regular user', async () => {
        await loginPage.goto();
        await loginPage.loginAndWaitForDashboard(user.email, user.password);
      });

      await test.step('Update profile first name', async () => {
        await page.goto('/profile');
        await page.waitForLoadState('networkidle');
        await page.getByTestId('profile-first-name').clear();
        await page.getByTestId('profile-first-name').fill(newName);

        const responsePromise = page.waitForResponse(
          (resp) => resp.url().includes('/api/users/profile') && resp.request().method() === 'PUT'
        );
        await page.getByTestId('save-profile-button').click();
        await responsePromise;
      });

      await test.step('Reload and verify name persisted', async () => {
        await page.reload();
        await page.waitForLoadState('networkidle');
        const nameValue = await page.getByTestId('profile-first-name').inputValue();
        expect(nameValue).toBe(newName);
      });
    } finally {
      // Restore original first name
      await apiClient.updateProfile({ first_name: originalName });
      await apiContext.dispose();
    }
  });
});
