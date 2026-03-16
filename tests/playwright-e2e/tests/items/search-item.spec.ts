import { test, expect } from '../../fixtures/test.fixture';
import { randomItemName } from '../../utils/randomData';

test.describe('Search Items', () => {
  let itemId: number;
  let searchableItemName: string;

  test.beforeAll(async ({ playwright }) => {
    // Setup: create a uniquely named item via API for searching
    searchableItemName = randomItemName();
    const apiContext = await playwright.request.newContext({
      baseURL: process.env.API_BASE_URL || 'http://localhost:8000',
    });

    const loginResp = await apiContext.post('/api/users/login/', {
      data: {
        email: process.env.ADMIN_EMAIL || 'admin@example.com',
        password: process.env.ADMIN_PASSWORD || 'Admin123!',
      },
    });
    const { token } = await loginResp.json();

    const createResp = await apiContext.post('/api/items/', {
      data: {
        name: searchableItemName,
        description: 'A searchable test item',
        category: 'electronics',
        price: 99.99,
      },
      headers: { Authorization: `Token ${token}` },
    });
    const body = await createResp.json();
    itemId = body.id;

    await apiContext.dispose();
  });

  test.afterAll(async ({ playwright }) => {
    // Cleanup
    const apiContext = await playwright.request.newContext({
      baseURL: process.env.API_BASE_URL || 'http://localhost:8000',
    });

    const loginResp = await apiContext.post('/api/users/login/', {
      data: {
        email: process.env.ADMIN_EMAIL || 'admin@example.com',
        password: process.env.ADMIN_PASSWORD || 'Admin123!',
      },
    });
    const { token } = await loginResp.json();

    await apiContext.delete(`/api/items/${itemId}/`, {
      headers: { Authorization: `Token ${token}` },
    });

    await apiContext.dispose();
  });

  test('search by name returns matching results', async ({ itemsPage }) => {
    await test.step('Navigate to items page', async () => {
      await itemsPage.goto();
    });

    await test.step('Search for the created item', async () => {
      await itemsPage.searchItems(searchableItemName);
    });

    await test.step('Verify the item appears in results', async () => {
      const itemLocator = await itemsPage.getItemByName(searchableItemName);
      await expect(itemLocator).toBeVisible();
    });
  });

  test('search with no results shows empty state', async ({ itemsPage }) => {
    const nonExistentName = `NonExistentItem-${Date.now()}`;

    await test.step('Navigate to items page', async () => {
      await itemsPage.goto();
    });

    await test.step('Search for a non-existent item', async () => {
      await itemsPage.searchItems(nonExistentName);
    });

    await test.step('Verify no results message is displayed', async () => {
      const isNoResults = await itemsPage.isNoResultsVisible();
      const itemCount = await itemsPage.getItemCount();
      // Either a "no results" message is shown or the list is empty
      expect(isNoResults || itemCount === 0).toBeTruthy();
    });
  });

  test('clearing search shows all items again', async ({ itemsPage }) => {
    await test.step('Navigate and search for specific item', async () => {
      await itemsPage.goto();
      await itemsPage.searchItems(searchableItemName);
    });

    await test.step('Clear search field', async () => {
      await itemsPage.searchItems('');
    });

    await test.step('Verify all items are displayed', async () => {
      const itemCount = await itemsPage.getItemCount();
      expect(itemCount).toBeGreaterThan(0);
    });
  });
});
