import { Page, Locator, expect } from '@playwright/test';

export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate(path: string): Promise<void> {
    await this.page.goto(path);
  }

  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForLoadState('networkidle');
  }

  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  async takeScreenshot(name: string): Promise<Buffer> {
    return await this.page.screenshot({
      path: `screenshots/${name}.png`,
      fullPage: true,
    });
  }

  async waitForNetworkIdle(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  async waitForUrl(url: string | RegExp): Promise<void> {
    await this.page.waitForURL(url);
  }

  async getLocatorByTestId(testId: string): Promise<Locator> {
    return this.page.getByTestId(testId);
  }

  async isVisible(locator: Locator): Promise<boolean> {
    return await locator.isVisible();
  }

  async clickAndWaitForNavigation(locator: Locator): Promise<void> {
    await Promise.all([
      this.page.waitForURL(/.*/, { waitUntil: 'domcontentloaded' }),
      locator.click(),
    ]);
  }

  async waitForResponse(urlPattern: string | RegExp): Promise<void> {
    await this.page.waitForResponse(urlPattern);
  }

  get navbar() {
    return {
      userRole: this.page.getByTestId('user-role'),
      logoutButton: this.page.getByTestId('logout-button'),
      profileLink: this.page.getByTestId('nav-profile'),
      dashboardLink: this.page.getByTestId('nav-dashboard'),
      itemsLink: this.page.getByTestId('nav-items'),
    };
  }

  async logout(): Promise<void> {
    await this.navbar.logoutButton.click();
    await this.page.waitForURL(/\/login/);
  }

  async getUserRole(): Promise<string> {
    return await this.navbar.userRole.textContent() ?? '';
  }
}
