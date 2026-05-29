import { test, expect } from '@playwright/test';
import { register, loginWith, PW } from './helpers';

// Each test gets a fresh browser context (new IDB + localStorage) by default.

test.describe('Auth flow', () => {
  // ── Login page ─────────────────────────────────────────────────────────────

  test('login page renders the sign-in form', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'QuestBoard' })).toBeVisible();
    await expect(page.getByLabel('Username or Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByText('Pixel-art project management')).toBeVisible();
  });

  test('empty submit stays on the login page (form validation)', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign In' }).click();
    // Zod + React Hook Form validation fires; page must not navigate
    await expect(page).toHaveURL(/\/login/);
  });

  test('wrong credentials keeps user on login page', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Username or Email').fill('nobody@questboard.test');
    await page.getByLabel('Password').fill('WrongPass99!');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  // ── Registration ───────────────────────────────────────────────────────────

  test('can register a new account and land on boards', async ({ page }) => {
    await register(page);

    await expect(page).toHaveURL(/\/boards$/);
    await expect(page.getByRole('heading', { name: 'Your Boards' })).toBeVisible();
  });

  test('register then sign out then login works', async ({ page }) => {
    const { email } = await register(page);

    // Sign out
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login/);

    // Log back in
    await loginWith(page, email, PW);
    await expect(page).toHaveURL(/\/boards$/);
    await expect(page.getByRole('heading', { name: 'Your Boards' })).toBeVisible();
  });

  // ── Auth-guard ─────────────────────────────────────────────────────────────

  test('authenticated user is redirected away from /login', async ({ page }) => {
    await register(page); // now authenticated + on /boards
    await page.goto('/login');
    await expect(page).toHaveURL(/\/boards$/);
  });

  test('unauthenticated user is redirected to /login from /boards', async ({ page }) => {
    await page.goto('/boards');
    await expect(page).toHaveURL(/\/login/);
  });
});
