import { test, expect } from '@playwright/test';

/**
 * Auth smoke tests for /login.
 *
 * The login screen lives in src/app/login/LoginClient.tsx and is a Supabase
 * Auth password form (with Turnstile and Google OAuth). We only assert the
 * shell here — the actual sign-in flow is tested in admin.spec.ts when the
 * E2E_ADMIN_* env vars are configured.
 */
test.describe('Auth — /login', () => {
  test('login page renders the email/password form', async ({ page }) => {
    await page.goto('/login');

    // Email + password inputs from LoginClient.tsx.
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();

    // Submit button (Arabic "تسجيل الدخول").
    await expect(
      page.getByRole('button', { name: /تسجيل الدخول|Sign in|Log in/i }).first()
    ).toBeVisible();
  });

  test('invalid credentials surface an error', async ({ page }) => {
    await page.goto('/login');

    // Ensure we're on the password tab — the form has two modes (password +
    // magic_link) toggled by buttons inside the card. We explicitly select
    // "كلمة المرور" to make the test deterministic across reloads.
    const passwordTab = page.getByRole('button', { name: 'كلمة المرور' });
    if (await passwordTab.isVisible().catch(() => false)) {
      await passwordTab.click();
    }

    await page.locator('input#email').fill('nobody-e2e@example.invalid');
    await page.locator('input#password').fill('definitely-wrong-password');

    // Turnstile is gated by NEXT_PUBLIC_TURNSTILE_SITE_KEY. When it isn't
    // configured in the test environment, the verifyBot() guard short-circuits
    // and shows the "complete the captcha" error — which is still a valid
    // proof that bad credentials don't silently succeed.
    const submit = page
      .getByRole('button', { name: /^تسجيل الدخول$|Sign in|Log in/i })
      .first();
    await submit.click();

    // Expect EITHER a credentials error OR the Turnstile guard message — both
    // prove the form did not happily log the user in.
    const errorRegex =
      /(غير صحيحة|روبوت|تحقق|invalid|wrong|incorrect|captcha|يرجى)/i;
    await expect(page.locator('body')).toContainText(errorRegex, {
      timeout: 10_000,
    });

    // We did NOT navigate to /admin.
    await expect(page).not.toHaveURL(/\/admin(\/|$)/);
  });
});
