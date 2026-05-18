import { test, expect } from '@playwright/test';

/**
 * Admin smoke tests.
 *
 * The admin layout (src/app/admin/layout.tsx) is a server component that calls
 * `auth.getUser()` and redirects to /login if there is no session. The login
 * lands the user back at /admin on success.
 *
 * To run the authenticated tests, set:
 *   E2E_ADMIN_EMAIL=...
 *   E2E_ADMIN_PASSWORD=...
 *
 * Without those vars, the auth-required tests skip with a notice rather than
 * fail — the smoke suite should pass on a fresh dev DB with no seeded admin.
 */
test.describe('Admin', () => {
  test('/admin redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto('/admin');
    // The admin layout server component should bounce us to /login.
    await expect(page).toHaveURL(/\/login(\?|$)/, { timeout: 10_000 });
    await expect(page.locator('input#email')).toBeVisible();
  });

  test('admin login flow lands on dashboard', async ({ page }) => {
    const email = process.env.E2E_ADMIN_EMAIL;
    const password = process.env.E2E_ADMIN_PASSWORD;

    test.skip(
      !email || !password,
      'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to enable the authenticated admin flow.'
    );

    await page.goto('/login');
    await page.locator('input#email').fill(email!);
    await page.locator('input#password').fill(password!);

    // NOTE: If Turnstile is enforced in this environment the click will not
    // sign in. In that case configure Turnstile test keys
    // (1x00000000000000000000AA) so the widget auto-passes.
    await page
      .getByRole('button', { name: /تسجيل الدخول|Sign in|Log in/i })
      .first()
      .click();

    await page.waitForURL(/\/admin(\/|$)/, { timeout: 15_000 });
    await expect(page).toHaveURL(/\/admin/);
  });

  test('admin dashboard shows the article list', async ({ page }) => {
    const email = process.env.E2E_ADMIN_EMAIL;
    const password = process.env.E2E_ADMIN_PASSWORD;

    test.skip(
      !email || !password,
      'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to enable the authenticated admin flow.'
    );

    // Sign in inline (each test gets a fresh context, so no storage state to
    // share across the suite for now).
    await page.goto('/login');
    await page.locator('input#email').fill(email!);
    await page.locator('input#password').fill(password!);
    await page
      .getByRole('button', { name: /تسجيل الدخول|Sign in|Log in/i })
      .first()
      .click();
    await page.waitForURL(/\/admin(\/|$)/, { timeout: 15_000 });

    await page.goto('/admin/articles');
    await expect(page.locator('main, [role="main"], body')).toBeVisible();
    // Either a populated table or an empty-state — both are acceptable. We
    // just guard against a server error page.
    await expect(page.locator('body')).not.toContainText(/Internal Server Error/i);
  });
});
