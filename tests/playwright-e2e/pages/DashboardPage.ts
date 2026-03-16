/**
 * Dashboard Page Object.
 * Encapsulates locators and actions for the dashboard page.
 * The dashboard shows a welcome message, stats, and quick navigation links.
 */
import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  readonly welcomeMessage: Locator;
  readonly statsSection: Locator;
  readonly totalItemsCount: Locator;
  readonly userRoleDisplay: Locator;
  readonly quickLinksSection: Locator;
  readonly viewItemsLink: Locator;
  readonly createItemLink: Locator;
  readonly viewProfileLink: Locator;

  constructor(page: Page) {
    super(page);
    // Locators matching the frontend's data-testid attributes
    this.welcomeMessage = page.getByTestId('welcome-message');
    this.statsSection = page.getByTestId('stats-section');
    this.totalItemsCount = page.getByTestId('total-items-count');
    this.userRoleDisplay = page.getByTestId('user-role-display');
    this.quickLinksSection = page.getByTestId('quick-links');
    this.viewItemsLink = page.getByTestId('link-view-items');
    this.createItemLink = page.getByTestId('link-create-item');
    this.viewProfileLink = page.getByTestId('link-profile');
  }

  /** Navigate to the dashboard page */
  async goto(): Promise<void> {
    await this.navigate('/dashboard');
    await this.waitForPageLoad();
  }

  /** Get the welcome message text shown at the top */
  async getWelcomeText(): Promise<string> {
    await this.welcomeMessage.waitFor({ state: 'visible' });
    return await this.welcomeMessage.textContent() ?? '';
  }

  /** Get the total items count from the stats section */
  async getTotalItemsCount(): Promise<string> {
    await this.totalItemsCount.waitFor({ state: 'visible' });
    return await this.totalItemsCount.textContent() ?? '0';
  }

  /** Get the user role displayed in the stats section */
  async getUserRoleDisplay(): Promise<string> {
    return await this.userRoleDisplay.textContent() ?? '';
  }

  /** Click the "View Items" quick link */
  async clickViewItems(): Promise<void> {
    await this.viewItemsLink.click();
    await this.page.waitForURL(/\/items/);
  }

  /** Click the "My Profile" quick link */
  async clickViewProfile(): Promise<void> {
    await this.viewProfileLink.click();
    await this.page.waitForURL(/\/profile/);
  }

  /** Check if the quick links section is visible */
  async isQuickLinksVisible(): Promise<boolean> {
    return await this.quickLinksSection.isVisible();
  }

  /** Check if the "Create Item" link is visible (admin only) */
  async isCreateItemLinkVisible(): Promise<boolean> {
    return await this.createItemLink.isVisible();
  }
}
