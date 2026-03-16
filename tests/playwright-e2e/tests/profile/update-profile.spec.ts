/**
 * Profile update tests.
 * Verifies that users can update their profile name and avatar.
 * Uses API for setup/cleanup to restore original profile data.
 * Runs serially to avoid interfering with other admin tests.
 */
import { test, expect } from '../../fixtures/test.fixture';
import { randomName } from '../../utils/randomData';
import path from 'path';

test.describe('Update Profile', () => {
  // Run these tests serially to avoid changing admin profile while other tests use it
  test.describe.configure({ mode: 'serial' });

  let originalFirstName: string;
  let originalLastName: string;

  test.beforeEach(async ({ apiClient }) => {
    // Save original name so we can restore it after the test
    const profile = await apiClient.getProfile();
    originalFirstName = (profile.first_name as string) || '';
    originalLastName = (profile.last_name as string) || '';
  });

  test.afterEach(async ({ apiClient }) => {
    // Restore original name via API
    await apiClient.updateProfile({
      first_name: originalFirstName,
      last_name: originalLastName,
    });
  });

  test('user can update their first name', async ({ profilePage }) => {
    const newFirstName = randomName();

    await test.step('Navigate to profile page', async () => {
      await profilePage.goto();
    });

    await test.step('Update the first name field', async () => {
      await profilePage.updateFirstName(newFirstName);
    });

    await test.step('Save changes', async () => {
      await profilePage.save();
    });

    await test.step('Verify success message is shown', async () => {
      const message = await profilePage.getSuccessMessage();
      expect(message).toBeTruthy();
    });

    await test.step('Verify name is updated after page reload', async () => {
      await profilePage.goto();
      const currentName = await profilePage.getFirstName();
      expect(currentName).toBe(newFirstName);
    });
  });

  test('profile page displays user email', async ({ profilePage }) => {
    await test.step('Navigate to profile page', async () => {
      await profilePage.goto();
    });

    await test.step('Verify email is displayed', async () => {
      const email = await profilePage.getEmail();
      expect(email).toContain('@');
    });
  });

  test('user can upload avatar', async ({ profilePage }) => {
    await test.step('Navigate to profile page', async () => {
      await profilePage.goto();
    });

    await test.step('Upload avatar image', async () => {
      // Use a real PNG image file for avatar upload
      const avatarPath = path.resolve(__dirname, '..', '..', 'test-data', 'test-avatar.png');
      await profilePage.uploadAvatar(avatarPath);
    });

    await test.step('Save profile', async () => {
      await profilePage.save();
    });

    await test.step('Verify success message', async () => {
      const message = await profilePage.getSuccessMessage();
      expect(message).toBeTruthy();
    });
  });
});
