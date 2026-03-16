import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ItemsPage } from '../pages/ItemsPage';
import { ProfilePage } from '../pages/ProfilePage';
import { ApiClient } from '../utils/apiClient';
import { getEnv } from '../utils/env';

type PageObjects = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  itemsPage: ItemsPage;
  profilePage: ProfilePage;
  apiClient: ApiClient;
};

export const test = base.extend<PageObjects>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },

  itemsPage: async ({ page }, use) => {
    const itemsPage = new ItemsPage(page);
    await use(itemsPage);
  },

  profilePage: async ({ page }, use) => {
    const profilePage = new ProfilePage(page);
    await use(profilePage);
  },

  apiClient: async ({ playwright }, use) => {
    const env = getEnv();
    const apiContext = await playwright.request.newContext({
      baseURL: env.API_BASE_URL,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    const client = new ApiClient(apiContext);
    await client.authenticate(env.ADMIN_EMAIL, env.ADMIN_PASSWORD);

    await use(client);

    await apiContext.dispose();
  },
});

export { expect };

/**
 * Test fixture with regular user storage state (not admin).
 * Use this for tests that need a regular user context.
 */
export const regularUserTest = base.extend<PageObjects>({
  storageState: 'playwright/.auth/user.json',

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  itemsPage: async ({ page }, use) => {
    await use(new ItemsPage(page));
  },

  profilePage: async ({ page }, use) => {
    await use(new ProfilePage(page));
  },

  apiClient: async ({ playwright }, use) => {
    const env = getEnv();
    const apiContext = await playwright.request.newContext({
      baseURL: env.API_BASE_URL,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    const client = new ApiClient(apiContext);
    await client.authenticate(env.USER_EMAIL, env.USER_PASSWORD);

    await use(client);

    await apiContext.dispose();
  },
});

/**
 * Test fixture with NO authentication (unauthenticated context).
 * Use this for login/logout tests.
 */
export const unauthenticatedTest = base.extend<PageObjects>({
  storageState: { cookies: [], origins: [] },

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  itemsPage: async ({ page }, use) => {
    await use(new ItemsPage(page));
  },

  profilePage: async ({ page }, use) => {
    await use(new ProfilePage(page));
  },

  apiClient: async ({ playwright }, use) => {
    const env = getEnv();
    const apiContext = await playwright.request.newContext({
      baseURL: env.API_BASE_URL,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    const client = new ApiClient(apiContext);

    await use(client);

    await apiContext.dispose();
  },
});
