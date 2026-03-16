import { test, expect } from '../../fixtures/test.fixture';
import { randomItemName } from '../../utils/randomData';

test.describe('Delete Item', () => {
  let itemId: number;
  let itemName: string;

  test.beforeEach(async ({ apiClient }) => {
    // Setup: create an item via API
    itemName = randomItemName();
    const item = await apiClient.createItem({
      name: itemName,
      description: 'Item to be deleted in test',
      category: 'electronics',
      price: 15.00,
    });
    itemId = item.id;
  });

  test('admin can delete an item after confirming', async ({ itemsPage }) => {
    await test.step('Navigate to items list', async () => {
      await itemsPage.goto();
    });

    await test.step('Search for the item to delete', async () => {
      await itemsPage.searchItems(itemName);
      const itemLocator = await itemsPage.getItemByName(itemName);
      await expect(itemLocator).toBeVisible();
    });

    await test.step('Click delete button', async () => {
      await itemsPage.clickDelete(itemName);
    });

    await test.step('Confirm deletion in the dialog', async () => {
      await itemsPage.confirmDelete();
    });

    await test.step('Verify item is removed from the list', async () => {
      const itemLocator = await itemsPage.getItemByName(itemName);
      await expect(itemLocator).toBeHidden();
    });
  });

  test('cancel delete keeps the item in the list', async ({ itemsPage, apiClient }) => {
    await test.step('Navigate to items list', async () => {
      await itemsPage.goto();
    });

    await test.step('Search for the item', async () => {
      await itemsPage.searchItems(itemName);
      const itemLocator = await itemsPage.getItemByName(itemName);
      await expect(itemLocator).toBeVisible();
    });

    await test.step('Click delete button', async () => {
      await itemsPage.clickDelete(itemName);
    });

    await test.step('Cancel the delete action', async () => {
      await itemsPage.cancelDelete();
    });

    await test.step('Verify item is still in the list', async () => {
      const itemLocator = await itemsPage.getItemByName(itemName);
      await expect(itemLocator).toBeVisible();
    });

    // Cleanup since we did not delete it
    await apiClient.safeDeleteItem(itemId);
  });
});
