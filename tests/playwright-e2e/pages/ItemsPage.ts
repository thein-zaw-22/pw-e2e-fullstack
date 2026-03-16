import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class ItemsPage extends BasePage {
  readonly itemsList: Locator;
  readonly searchInput: Locator;
  readonly createButton: Locator;
  readonly noResultsMessage: Locator;
  readonly confirmDialog: Locator;
  readonly confirmDeleteButton: Locator;
  readonly cancelDeleteButton: Locator;
  readonly itemNameInput: Locator;
  readonly itemDescriptionInput: Locator;
  readonly itemCategorySelect: Locator;
  readonly itemPriceInput: Locator;
  readonly itemAttachmentInput: Locator;
  readonly saveButton: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    super(page);
    // Locators matching the frontend's data-testid attributes
    this.itemsList = page.getByTestId('items-table');
    this.searchInput = page.getByTestId('search-input');
    this.createButton = page.getByTestId('create-item-button');
    this.noResultsMessage = page.getByTestId('no-items-message');
    this.confirmDialog = page.getByTestId('confirm-dialog');
    this.confirmDeleteButton = page.getByTestId('dialog-confirm');
    this.cancelDeleteButton = page.getByTestId('dialog-cancel');
    this.itemNameInput = page.getByTestId('item-name-input');
    this.itemDescriptionInput = page.getByTestId('item-description-input');
    this.itemCategorySelect = page.getByTestId('item-category-select');
    this.itemPriceInput = page.getByTestId('item-price-input');
    this.itemAttachmentInput = page.getByTestId('item-attachment-input');
    this.saveButton = page.getByTestId('submit-item-button');
    this.successMessage = page.getByText(/successfully/i);
  }

  async goto(): Promise<void> {
    await this.navigate('/items');
    await this.waitForPageLoad();
  }

  async gotoCreate(): Promise<void> {
    await this.navigate('/items/create');
    await this.waitForPageLoad();
  }

  async gotoEdit(itemId: string | number): Promise<void> {
    await this.navigate(`/items/${itemId}/edit`);
    await this.waitForPageLoad();
  }

  /** Type a search query and click the Search button */
  async searchItems(query: string): Promise<void> {
    await this.searchInput.clear();
    await this.searchInput.fill(query);
    // Click search button and wait for the items API response
    const searchButton = this.page.getByTestId('search-button');
    // Set up response listener before clicking to avoid race condition
    const responsePromise = this.page.waitForResponse(
      (resp) => resp.url().includes('/api/items') && resp.request().method() === 'GET'
    );
    await searchButton.click();
    await responsePromise;
    // Wait for the UI to update after the response
    await this.page.waitForLoadState('networkidle');
  }

  async clickCreate(): Promise<void> {
    await this.createButton.click();
    await this.page.waitForURL(/\/items\/create/);
  }

  async clickEdit(itemName: string): Promise<void> {
    const itemRow = this.page.getByTestId(`item-row-${itemName}`).or(
      this.page.locator(`[data-item-name="${itemName}"]`)
    );
    const editButton = itemRow.getByRole('button', { name: /edit/i });
    await editButton.click();
    await this.page.waitForURL(/\/items\/\d+\/edit/);
  }

  async clickDelete(itemName: string): Promise<void> {
    const itemRow = this.page.getByTestId(`item-row-${itemName}`).or(
      this.page.locator(`[data-item-name="${itemName}"]`)
    );
    const deleteButton = itemRow.getByRole('button', { name: /delete/i });
    await deleteButton.click();
  }

  async confirmDelete(): Promise<void> {
    await this.confirmDialog.waitFor({ state: 'visible' });
    const responsePromise = this.page.waitForResponse(
      (resp) => resp.url().includes('/api/items/') && resp.request().method() === 'DELETE'
    );
    await this.confirmDeleteButton.click();
    await responsePromise;
  }

  async cancelDelete(): Promise<void> {
    await this.confirmDialog.waitFor({ state: 'visible' });
    await this.cancelDeleteButton.click();
    await this.confirmDialog.waitFor({ state: 'hidden' });
  }

  async getItemCount(): Promise<number> {
    const items = this.page.getByTestId(/^item-row-/);
    return await items.count();
  }

  async getItemByName(name: string): Promise<Locator> {
    return this.page.getByTestId(`item-row-${name}`).or(
      this.page.locator(`[data-item-name="${name}"]`)
    );
  }

  async isCreateButtonVisible(): Promise<boolean> {
    return await this.createButton.isVisible();
  }

  async getEditButton(itemName: string): Promise<Locator> {
    const itemRow = this.page.getByTestId(`item-row-${itemName}`).or(
      this.page.locator(`[data-item-name="${itemName}"]`)
    );
    return itemRow.getByRole('button', { name: /edit/i });
  }

  async getDeleteButton(itemName: string): Promise<Locator> {
    const itemRow = this.page.getByTestId(`item-row-${itemName}`).or(
      this.page.locator(`[data-item-name="${itemName}"]`)
    );
    return itemRow.getByRole('button', { name: /delete/i });
  }

  async isNoResultsVisible(): Promise<boolean> {
    return await this.noResultsMessage.isVisible();
  }

  async fillItemForm(data: {
    name: string;
    description: string;
    category: string;
    price: string;
    attachmentPath?: string;
  }): Promise<void> {
    await this.itemNameInput.fill(data.name);
    await this.itemDescriptionInput.fill(data.description);
    await this.itemCategorySelect.selectOption(data.category);
    await this.itemPriceInput.fill(data.price);
    if (data.attachmentPath) {
      await this.itemAttachmentInput.setInputFiles(data.attachmentPath);
    }
  }

  async submitForm(): Promise<void> {
    const responsePromise = this.page.waitForResponse(
      (resp) => resp.url().includes('/api/items') && resp.status() < 500
    );
    await this.saveButton.click();
    await responsePromise;
  }

  async getSuccessMessage(): Promise<string> {
    await this.successMessage.waitFor({ state: 'visible' });
    return await this.successMessage.textContent() ?? '';
  }
}
