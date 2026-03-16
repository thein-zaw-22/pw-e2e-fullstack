import { test, expect, regularUserTest } from '../../fixtures/test.fixture';

test.describe('Role-Based Access - Admin', () => {
  test('admin can see create, edit, and delete buttons on items page', async ({ itemsPage }) => {
    await test.step('Navigate to items page as admin', async () => {
      await itemsPage.goto();
    });

    await test.step('Verify create button is visible', async () => {
      await expect(itemsPage.createButton).toBeVisible();
    });

    await test.step('Verify edit and delete buttons exist in item rows', async () => {
      const itemCount = await itemsPage.getItemCount();
      if (itemCount > 0) {
        // Check first item row for edit/delete buttons
        const editButtons = itemsPage.page.getByRole('button', { name: /edit/i });
        const deleteButtons = itemsPage.page.getByRole('button', { name: /delete/i });
        expect.soft(await editButtons.count()).toBeGreaterThan(0);
        expect.soft(await deleteButtons.count()).toBeGreaterThan(0);
      }
    });
  });
});

regularUserTest.describe('Role-Based Access - Regular User', () => {
  regularUserTest('regular user cannot see create button', async ({ itemsPage }) => {
    await regularUserTest.step('Navigate to items page as regular user', async () => {
      await itemsPage.goto();
    });

    await regularUserTest.step('Verify create button is NOT visible', async () => {
      const isVisible = await itemsPage.isCreateButtonVisible();
      expect(isVisible).toBeFalsy();
    });
  });

  regularUserTest('regular user cannot see edit and delete buttons', async ({ itemsPage }) => {
    await regularUserTest.step('Navigate to items page as regular user', async () => {
      await itemsPage.goto();
    });

    await regularUserTest.step('Verify edit and delete buttons are NOT visible', async () => {
      const editButtons = itemsPage.page.getByRole('button', { name: /edit/i });
      const deleteButtons = itemsPage.page.getByRole('button', { name: /delete/i });

      expect.soft(await editButtons.count()).toBe(0);
      expect.soft(await deleteButtons.count()).toBe(0);
    });
  });

  regularUserTest('regular user can still view items list', async ({ itemsPage }) => {
    await regularUserTest.step('Navigate to items page', async () => {
      await itemsPage.goto();
    });

    await regularUserTest.step('Verify items list is visible', async () => {
      await expect(itemsPage.itemsList).toBeVisible();
    });
  });
});
