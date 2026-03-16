import { test, expect } from '../../fixtures/test.fixture';
import { randomItemName, randomDescription, randomPrice, randomCategory } from '../../utils/randomData';

test.describe('Edit Item', () => {
  let itemId: number;
  let originalName: string;

  test.beforeEach(async ({ apiClient }) => {
    // Setup: create an item via API
    originalName = randomItemName();
    const item = await apiClient.createItem({
      name: originalName,
      description: 'Item to be edited',
      category: 'electronics',
      price: 25.00,
    });
    itemId = item.id;
  });

  test.afterEach(async ({ apiClient }) => {
    // Cleanup via API
    await apiClient.safeDeleteItem(itemId);
  });

  test('admin can edit an existing item', async ({ itemsPage, page }) => {
    const updatedName = randomItemName();
    const updatedDescription = randomDescription();
    const updatedPrice = randomPrice();

    await test.step('Navigate to edit page for the item', async () => {
      await itemsPage.gotoEdit(itemId);
    });

    await test.step('Verify the form is pre-filled with current values', async () => {
      const currentName = await itemsPage.itemNameInput.inputValue();
      expect(currentName).toBe(originalName);
    });

    await test.step('Update the item fields', async () => {
      await itemsPage.itemNameInput.clear();
      await itemsPage.itemNameInput.fill(updatedName);
      await itemsPage.itemDescriptionInput.clear();
      await itemsPage.itemDescriptionInput.fill(updatedDescription);
      await itemsPage.itemPriceInput.clear();
      await itemsPage.itemPriceInput.fill(updatedPrice);
    });

    await test.step('Save changes', async () => {
      await itemsPage.submitForm();
    });

    await test.step('Verify changes are reflected in the items list', async () => {
      await page.waitForURL(/\/items/);
      await itemsPage.goto();
      await itemsPage.searchItems(updatedName);
      const itemLocator = await itemsPage.getItemByName(updatedName);
      await expect(itemLocator).toBeVisible();
    });
  });

  test('edit form shows validation errors on invalid input', async ({ itemsPage, page }) => {
    await test.step('Navigate to edit page', async () => {
      await itemsPage.gotoEdit(itemId);
    });

    await test.step('Clear required fields', async () => {
      await itemsPage.itemNameInput.clear();
    });

    await test.step('Submit and verify validation', async () => {
      await itemsPage.saveButton.click();
      // Should remain on edit page due to validation
      await expect(page).toHaveURL(/\/items\/\d+\/edit/);
    });
  });
});
