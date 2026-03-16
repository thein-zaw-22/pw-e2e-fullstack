import { test, expect } from '@playwright/test';
import { ApiClient, ItemResponse } from '../../utils/apiClient';
import { getEnv } from '../../utils/env';
import { randomItemName, randomDescription, randomPrice, randomCategory } from '../../utils/randomData';

test.describe('Items API Tests', () => {
  let apiClient: ApiClient;
  const createdItemIds: number[] = [];

  test.beforeAll(async ({ playwright }) => {
    const env = getEnv();
    const apiContext = await playwright.request.newContext({
      baseURL: env.API_BASE_URL,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    apiClient = new ApiClient(apiContext);
    await apiClient.authenticate(env.ADMIN_EMAIL, env.ADMIN_PASSWORD);
  });

  test.afterAll(async () => {
    // Cleanup all created items
    for (const id of createdItemIds) {
      await apiClient.safeDeleteItem(id);
    }
  });

  test('POST /api/items/ - create a new item', async () => {
    const itemData = {
      name: randomItemName(),
      description: randomDescription(),
      category: randomCategory(),
      price: parseFloat(randomPrice()),
    };

    const item = await apiClient.createItem(itemData);
    createdItemIds.push(item.id);

    expect(item.id).toBeDefined();
    expect(item.name).toBe(itemData.name);
    expect(item.description).toBe(itemData.description);
    expect(item.category).toBe(itemData.category);
  });

  test('GET /api/items/ - list all items', async () => {
    // Ensure at least one item exists
    const itemData = {
      name: randomItemName(),
      description: 'List test item',
      category: 'electronics',
      price: 10,
    };
    const created = await apiClient.createItem(itemData);
    createdItemIds.push(created.id);

    const items = await apiClient.getItems();
    expect(Array.isArray(items)).toBeTruthy();
    expect(items.length).toBeGreaterThan(0);
  });

  test('GET /api/items/:id/ - get a single item', async () => {
    const itemData = {
      name: randomItemName(),
      description: 'Single item test',
      category: 'books',
      price: 25.5,
    };
    const created = await apiClient.createItem(itemData);
    createdItemIds.push(created.id);

    const fetched = await apiClient.getItem(created.id);
    expect(fetched.id).toBe(created.id);
    expect(fetched.name).toBe(itemData.name);
    expect(fetched.description).toBe(itemData.description);
  });

  test('GET /api/items/?search= - search items by name', async () => {
    const uniqueName = randomItemName();
    const itemData = {
      name: uniqueName,
      description: 'Search test item',
      category: 'electronics',
      price: 15,
    };
    const created = await apiClient.createItem(itemData);
    createdItemIds.push(created.id);

    const results = await apiClient.getItems(uniqueName);
    expect(results.length).toBeGreaterThan(0);

    const found = results.find((item) => item.name === uniqueName);
    expect(found).toBeDefined();
  });

  test('PUT /api/items/:id/ - update an item', async () => {
    const itemData = {
      name: randomItemName(),
      description: 'Item to update',
      category: 'clothing',
      price: 30,
    };
    const created = await apiClient.createItem(itemData);
    createdItemIds.push(created.id);

    const updatedName = randomItemName();
    const updated = await apiClient.updateItem(created.id, {
      name: updatedName,
      description: 'Updated description',
    });

    expect(updated.name).toBe(updatedName);
    expect(updated.description).toBe('Updated description');
  });

  test('DELETE /api/items/:id/ - delete an item', async () => {
    const itemData = {
      name: randomItemName(),
      description: 'Item to delete',
      category: 'home',
      price: 5,
    };
    const created = await apiClient.createItem(itemData);

    await apiClient.deleteItem(created.id);

    // Verify item no longer exists by trying to fetch it
    const env = getEnv();
    const request = await (await import('@playwright/test')).request.newContext({
      baseURL: env.API_BASE_URL,
    });

    const loginResp = await request.post('/api/users/login/', {
      data: { email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD },
    });
    const { token } = await loginResp.json();

    const getResp = await request.get(`/api/items/${created.id}/`, {
      headers: { Authorization: `Token ${token}` },
    });
    expect(getResp.status()).toBe(404);

    await request.dispose();
  });

  test('POST /api/users/login/ - authenticate user', async ({ playwright }) => {
    const env = getEnv();
    const apiContext = await playwright.request.newContext({
      baseURL: env.API_BASE_URL,
    });

    const response = await apiContext.post('/api/users/login/', {
      data: {
        email: env.ADMIN_EMAIL,
        password: env.ADMIN_PASSWORD,
      },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.token).toBeDefined();
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe(env.ADMIN_EMAIL);
    expect(body.user.role).toBe('admin');

    await apiContext.dispose();
  });

  test('GET /api/users/profile/ - get user profile', async () => {
    const profile = await apiClient.getProfile();
    expect(profile).toBeDefined();
    expect(profile.email).toBeDefined();
    expect(profile.first_name).toBeDefined();
  });
});
