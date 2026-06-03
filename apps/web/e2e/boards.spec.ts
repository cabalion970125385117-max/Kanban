import { test, expect } from '@playwright/test';
import { register } from './helpers';

// Each test starts fresh: registers a new user → lands on /boards.

test.describe('Boards page', () => {
  test.beforeEach(async ({ page }) => {
    await register(page);
  });

  test('shows boards heading and empty-state copy', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Your Boards' })).toBeVisible();
    await expect(page.getByText('0 boards')).toBeVisible();
    await expect(page.getByText('No boards yet')).toBeVisible();
  });

  test('New Board button opens the create form', async ({ page }) => {
    await page.getByRole('button', { name: 'New Board' }).click();
    await expect(page.getByPlaceholder('Board name…')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
  });

  test('cancelling the form hides it without creating a board', async ({ page }) => {
    await page.getByRole('button', { name: 'New Board' }).click();
    await page.getByPlaceholder('Board name…').fill('Should not persist');
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByPlaceholder('Board name…')).not.toBeVisible();
    await expect(page.getByText('0 boards')).toBeVisible();
  });

  test('creating a board navigates to the board canvas', async ({ page }) => {
    await page.getByRole('button', { name: 'New Board' }).click();
    await page.getByPlaceholder('Board name…').fill('Sprint #1');
    await page.getByRole('button', { name: 'Create' }).click();

    // Should navigate to /boards/<id>
    await expect(page).toHaveURL(/\/boards\/[a-z0-9-]+$/);
    // BoardHeaderV2 shows the board name as h1
    await expect(page.getByRole('heading', { level: 1 }).filter({ hasText: 'Sprint #1' })).toBeVisible();
  });

  test('pressing Enter in the name field creates the board', async ({ page }) => {
    await page.getByRole('button', { name: 'New Board' }).click();
    await page.getByPlaceholder('Board name…').fill('Keyboard Board');
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/boards\/[a-z0-9-]+$/);
  });

  test('board appears in the list after back-navigation', async ({ page }) => {
    await page.getByRole('button', { name: 'New Board' }).click();
    await page.getByPlaceholder('Board name…').fill('My Project');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/boards\/[a-z0-9-]+$/);

    // Go back via the header back-button
    await page.getByRole('button', { name: 'Back to boards' }).click();
    await expect(page).toHaveURL(/\/boards$/);
    await expect(page.getByText('My Project')).toBeVisible();
    await expect(page.getByText('1 board')).toBeVisible();
  });

  test('clicking a board card opens that board', async ({ page }) => {
    await page.getByRole('button', { name: 'New Board' }).click();
    await page.getByPlaceholder('Board name…').fill('Clickable');
    await page.keyboard.press('Enter');
    const boardUrl = page.url();

    await page.getByRole('button', { name: 'Back to boards' }).click();
    await page.getByText('Clickable').click();
    await expect(page).toHaveURL(boardUrl);
  });
});
