import type { Page } from '@playwright/test';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Default password used for all test accounts */
export const PW = 'Questboard1!';

/** Generate a unique email per call so parallel/serial tests don't collide */
export function uniqueEmail(): string {
  return `hero-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@questboard.test`;
}

// ── IDB helpers ───────────────────────────────────────────────────────────────

/**
 * Delete every IndexedDB database accessible at the current origin and clear
 * localStorage (Zustand auth-persist).  Call inside a beforeEach when a
 * completely fresh state is required.
 */
export async function clearDatabase(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(async () => {
    // Clear all IDB databases at this origin
    const dbs = await indexedDB.databases?.() ?? [];
    await Promise.all(
      dbs
        .filter((d) => !!d.name)
        .map(
          (d) =>
            new Promise<void>((res, rej) => {
              const req = indexedDB.deleteDatabase(d.name!);
              req.onsuccess = () => res();
              req.onerror = () => rej(req.error);
              req.onblocked = () => res(); // proceed even if blocked
            }),
        ),
    );
    localStorage.clear();
    sessionStorage.clear();
  });
}

// ── Auth helpers ──────────────────────────────────────────────────────────────

export interface TestUser {
  name: string;
  email: string;
  password: string;
}

/**
 * Register a new user through the UI and land on /boards.
 * Returns the credentials so tests can log in again later.
 */
export async function register(
  page: Page,
  opts: Partial<TestUser> = {},
): Promise<TestUser> {
  const user: TestUser = {
    name: opts.name ?? 'Test Hero',
    email: opts.email ?? uniqueEmail(),
    password: opts.password ?? PW,
  };

  await page.goto('/register');

  await page.getByLabel('Display Name').fill(user.name);
  await page.getByLabel('Email').fill(user.email);
  // "Password" label appears twice (Password + Confirm Password)
  await page.getByLabel('Password').first().fill(user.password);
  await page.getByLabel('Confirm Password').fill(user.password);

  // Pick the Knight avatar (has aria-label="Select Knight avatar")
  await page.getByRole('button', { name: 'Select Knight avatar' }).click();

  await page.getByRole('button', { name: 'Begin Your Quest' }).click();
  await page.waitForURL('**/boards', { timeout: 10_000 });

  return user;
}

/**
 * Log in through the UI and land on /boards.
 */
export async function loginWith(
  page: Page,
  identifier: string,
  password: string,
): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Username or Email').fill(identifier);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL('**/boards', { timeout: 10_000 });
}

// ── Board helpers ─────────────────────────────────────────────────────────────

/**
 * Register a fresh user, create one board, and return its URL.
 * Leaves the page on the board canvas.
 */
export async function setupBoard(
  page: Page,
  boardName = 'E2E Board',
): Promise<{ user: TestUser; boardUrl: string }> {
  const user = await register(page);

  await page.getByRole('button', { name: 'New Board' }).click();
  await page.getByPlaceholder('Board name…').fill(boardName);
  await page.keyboard.press('Enter');
  await page.waitForURL('**/boards/**', { timeout: 10_000 });

  return { user, boardUrl: page.url() };
}
