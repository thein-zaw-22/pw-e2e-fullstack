import { test, expect } from '../../fixtures/test.fixture';
import { randomItemName, randomDescription, randomPrice, randomCategory } from '../../utils/randomData';

test.describe('Create Item', () => {
  let createdItemName: string;

  test.afterEach(async ({ apiClient }) => {
    // Cleanup: find and delete the created item via API
    if (createdItemName) {
      try {
        const items = await apiClient.getItems(createdItemName);
        for (const item of items) {
          if (item.name === createdItemName) {
            await apiClient.safeDeleteItem(item.id);
          }
        }
      } catch {
        // Cleanup is best-effort
      }
    }
  });

  test('admin can create a new item via UI', async ({ itemsPage, page }) => {
    createdItemName = randomItemName();
    const description = randomDescription();
    const price = randomPrice();
    const category = randomCategory();

    await test.step('Navigate to create item page', async () => {
      await itemsPage.goto();
      await itemsPage.clickCreate();
      await expect(page).toHaveURL(/\/items\/create/);
    });

    await test.step('Fill in the item form', async () => {
      await itemsPage.fillItemForm({
        name: createdItemName,
        description,
        category,
        price,
      });
    });

    await test.step('Submit the form', async () => {
      await itemsPage.submitForm();
    });

    await test.step('Verify redirect to items list', async () => {
      await page.waitForURL(/\/items/);
    });

    await test.step('Verify the new item appears in the list', async () => {
      await itemsPage.goto();
      await itemsPage.searchItems(createdItemName);
      const itemLocator = await itemsPage.getItemByName(createdItemName);
      await expect(itemLocator).toBeVisible();
    });
  });

  test('admin can create item with file attachment', async ({ itemsPage, page }) => {
    createdItemName = randomItemName();
    const description = randomDescription();
    const price = randomPrice();
    const category = randomCategory();

    await test.step('Navigate to create item page', async () => {
      await itemsPage.gotoCreate();
    });

    await test.step('Fill in the item form with attachment', async () => {
      await itemsPage.fillItemForm({
        name: createdItemName,
        description,
        category,
        price,
        attachmentPath: 'test-data/items.json', // Use an existing file as test attachment
      });
    });

    await test.step('Submit the form', async () => {
      await itemsPage.submitForm();
    });

    await test.step('Verify item was created', async () => {
      await page.waitForURL(/\/items/);
      await itemsPage.goto();
      await itemsPage.searchItems(createdItemName);
      const itemLocator = await itemsPage.getItemByName(createdItemName);
      await expect(itemLocator).toBeVisible();
    });
  });

  test('form validation prevents empty submission', async ({ itemsPage, page }) => {
    await test.step('Navigate to create item page', async () => {
      await itemsPage.gotoCreate();
    });

    await test.step('Submit empty form', async () => {
      await itemsPage.saveButton.click();
    });

    await test.step('Verify user stays on create page', async () => {
      await expect(page).toHaveURL(/\/items\/create/);
    });
  });
});
