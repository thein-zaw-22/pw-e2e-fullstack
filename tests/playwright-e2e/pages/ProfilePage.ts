/**
 * Profile Page Object.
 * Encapsulates locators and actions for the user profile page.
 * Users can update their name and upload an avatar here.
 */
import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class ProfilePage extends BasePage {
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailDisplay: Locator;
  readonly roleDisplay: Locator;
  readonly avatarUploadInput: Locator;
  readonly saveButton: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    // Locators matching the frontend's data-testid attributes
    this.firstNameInput = page.getByTestId('profile-first-name');
    this.lastNameInput = page.getByTestId('profile-last-name');
    this.emailDisplay = page.getByTestId('profile-email');
    this.roleDisplay = page.getByTestId('profile-role');
    this.avatarUploadInput = page.getByTestId('profile-avatar-input');
    this.saveButton = page.getByTestId('save-profile-button');
    this.successMessage = page.getByTestId('profile-success');
    this.errorMessage = page.getByTestId('profile-error');
  }

  async goto(): Promise<void> {
    await this.navigate('/profile');
    await this.waitForPageLoad();
  }

  /** Update the first name field */
  async updateFirstName(newName: string): Promise<void> {
    await this.firstNameInput.clear();
    await this.firstNameInput.fill(newName);
  }

  /** Update the last name field */
  async updateLastName(newName: string): Promise<void> {
    await this.lastNameInput.clear();
    await this.lastNameInput.fill(newName);
  }

  async uploadAvatar(filePath: string): Promise<void> {
    await this.avatarUploadInput.setInputFiles(filePath);
  }

  async save(): Promise<void> {
    const responsePromise = this.page.waitForResponse(
      (resp) => resp.url().includes('/api/users/profile')
    );
    await this.saveButton.click();
    await responsePromise;
  }

  async getSuccessMessage(): Promise<string> {
    await this.successMessage.waitFor({ state: 'visible' });
    return await this.successMessage.textContent() ?? '';
  }

  /** Get the current first name value */
  async getFirstName(): Promise<string> {
    return await this.firstNameInput.inputValue();
  }

  /** Get the current last name value */
  async getLastName(): Promise<string> {
    return await this.lastNameInput.inputValue();
  }

  /** Get the displayed email (read-only field) */
  async getEmail(): Promise<string> {
    return await this.emailDisplay.inputValue();
  }
}
