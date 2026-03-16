import { Page, Locator, expect } from '@playwright/test';

/**
 * Wait for an element to be visible and stable (not animating).
 */
export async function waitForStableElement(locator: Locator, timeout: number = 10_000): Promise<void> {
  await locator.waitFor({ state: 'visible', timeout });
  // Wait for the element position to stabilize (no ongoing CSS transitions)
  await expect(locator).toBeVisible({ timeout });
}

/**
 * Wait for a specific API response matching URL and optional status code.
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  options: { status?: number; timeout?: number } = {}
): Promise<void> {
  const { status, timeout = 15_000 } = options;
  await page.waitForResponse(
    (response) => {
      const matchesUrl = typeof urlPattern === 'string'
        ? response.url().includes(urlPattern)
        : urlPattern.test(response.url());
      const matchesStatus = status ? response.status() === status : true;
      return matchesUrl && matchesStatus;
    },
    { timeout }
  );
}

/**
 * Wait for navigation to a specific URL pattern.
 */
export async function waitForNavigation(
  page: Page,
  urlPattern: string | RegExp,
  timeout: number = 15_000
): Promise<void> {
  await page.waitForURL(urlPattern, { timeout, waitUntil: 'domcontentloaded' });
}

/**
 * Retry an action until it succeeds or the timeout is reached.
 */
export async function retryAction(
  action: () => Promise<void>,
  options: { maxRetries?: number; delayMs?: number } = {}
): Promise<void> {
  const { maxRetries = 3, delayMs = 1000 } = options;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await action();
      return;
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

/**
 * Wait until a locator's text content matches the expected value.
 */
export async function waitForText(
  locator: Locator,
  expectedText: string | RegExp,
  timeout: number = 10_000
): Promise<void> {
  if (typeof expectedText === 'string') {
    await expect(locator).toHaveText(expectedText, { timeout });
  } else {
    await expect(locator).toHaveText(expectedText, { timeout });
  }
}
