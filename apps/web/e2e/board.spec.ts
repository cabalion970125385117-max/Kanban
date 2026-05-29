import { test, expect } from '@playwright/test';
import { setupBoard } from './helpers';

// Each test: fresh user → fresh board → board canvas.

test.describe('Board canvas', () => {
  test.beforeEach(async ({ page }) => {
    await setupBoard(page);
  });

  // ── Layout ─────────────────────────────────────────────────────────────────

  test('shows inbox panel and Add column button', async ({ page }) => {
    await expect(page.locator('text=Inbox')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add column' })).toBeVisible();
  });

  test('header has back, Gantt, Analytics and Settings buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Back to boards' })).toBeVisible();
    await expect(page.getByRole('button', { name: /gantt/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Analytics' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible();
  });

  // ── Columns ────────────────────────────────────────────────────────────────

  test('can add a column', async ({ page }) => {
    await page.getByRole('button', { name: 'Add column' }).click();
    await page.getByPlaceholder('Column name…').fill('To Do');
    await page.keyboard.press('Enter');

    await expect(page.getByText('To Do')).toBeVisible();
  });

  test('can rename a column by clicking its title', async ({ page }) => {
    // Create column first
    await page.getByRole('button', { name: 'Add column' }).click();
    await page.getByPlaceholder('Column name…').fill('Old Name');
    await page.keyboard.press('Enter');
    await expect(page.getByText('Old Name')).toBeVisible();

    // Click title to rename
    await page.getByText('Old Name').click();
    await page.getByRole('textbox').last().fill('New Name');
    await page.keyboard.press('Enter');

    await expect(page.getByText('New Name')).toBeVisible();
    await expect(page.getByText('Old Name')).not.toBeVisible();
  });

  // ── Cards ──────────────────────────────────────────────────────────────────

  test('can add a card to a column', async ({ page }) => {
    await page.getByRole('button', { name: 'Add column' }).click();
    await page.getByPlaceholder('Column name…').fill('Backlog');
    await page.keyboard.press('Enter');

    await page.getByText('+ Add a card').first().click();
    await page.getByPlaceholder('Card title…').fill('First task');
    await page.getByRole('button', { name: 'Add card' }).click();

    await expect(page.getByText('First task')).toBeVisible();
  });

  test('clicking a card opens the detail drawer', async ({ page }) => {
    await page.getByRole('button', { name: 'Add column' }).click();
    await page.getByPlaceholder('Column name…').fill('In Progress');
    await page.keyboard.press('Enter');

    await page.getByText('+ Add a card').first().click();
    await page.getByPlaceholder('Card title…').fill('Drawer task');
    await page.getByRole('button', { name: 'Add card' }).click();

    await page.getByText('Drawer task').click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog').getByText('Drawer task')).toBeVisible();
  });

  // ── Navigation ─────────────────────────────────────────────────────────────

  test('Gantt button navigates to the Gantt view', async ({ page }) => {
    await page.getByRole('button', { name: /switch to gantt/i }).click();
    await expect(page).toHaveURL(/\/gantt$/);
  });

  test('back button from Gantt returns to board canvas', async ({ page }) => {
    const boardUrl = page.url();
    await page.getByRole('button', { name: /switch to gantt/i }).click();
    await expect(page).toHaveURL(/\/gantt$/);
    // Header toggle now says "Board"
    await page.getByRole('button', { name: /switch to board/i }).click();
    await expect(page).toHaveURL(boardUrl);
  });

  test('back button from board returns to boards list', async ({ page }) => {
    await page.getByRole('button', { name: 'Back to boards' }).click();
    await expect(page).toHaveURL(/\/boards$/);
  });
});
