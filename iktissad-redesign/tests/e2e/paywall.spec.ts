import { test, expect } from '@playwright/test';

/**
 * Paywall smoke tests.
 *
 * The anonymous meter is stored in localStorage under `ikt_reads` as
 * `{ month: "YYYY-M", slugs: string[] }` — see src/app/[slug]/PageClient.tsx
 * (ANON_METER_KEY). We inject a saturated meter so the next paywalled article
 * trips the gate without needing to walk through 3+ reads.
 *
 * These tests need:
 *   - PLAYWRIGHT_PAYWALL_ARTICLE_SLUG  — slug of a paywalled article
 *   - PLAYWRIGHT_GIFT_TOKEN            — a valid ?gift= token (optional)
 *
 * When the env vars are missing we skip with a clear notice rather than fail —
 * smoke shouldn't depend on fixture data that isn't present in a fresh dev DB.
 */
test.describe('Paywall', () => {
  const PAYWALLED_SLUG = process.env.PLAYWRIGHT_PAYWALL_ARTICLE_SLUG;
  const GIFT_TOKEN = process.env.PLAYWRIGHT_GIFT_TOKEN;

  test('paywall modal triggers after read limit (cookie/storage injection)', async ({
    page,
  }) => {
    test.skip(
      !PAYWALLED_SLUG,
      'Set PLAYWRIGHT_PAYWALL_ARTICLE_SLUG to enable — requires a paywalled article in the DB.'
    );

    // Saturate the anonymous meter so the next article hits the gate.
    // initScript fires BEFORE any of the page's own JS, so the meter is set
    // before ArticlePageClient mounts and reads it.
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${now.getMonth()}`;
    const saturated = {
      month: currentMonth,
      slugs: ['_e2e_a', '_e2e_b', '_e2e_c', '_e2e_d', '_e2e_e'],
    };
    await page.addInitScript((value) => {
      try {
        window.localStorage.setItem('ikt_reads', value);
      } catch {
        /* storage disabled — test will skip the assertion below */
      }
    }, JSON.stringify(saturated));

    await page.goto(`/${PAYWALLED_SLUG}`);

    // Modal contains the paywall headline / CTA. We accept any of the known
    // Arabic strings used by PaywallModal.tsx.
    const paywallRegex = /(اشترك|الاشتراك|للوصول|paywall|subscribe)/i;
    await expect(page.locator('body')).toContainText(paywallRegex, {
      timeout: 10_000,
    });
  });

  test('gift link bypass shows the full article', async ({ page }) => {
    test.skip(
      !PAYWALLED_SLUG || !GIFT_TOKEN,
      'Set PLAYWRIGHT_PAYWALL_ARTICLE_SLUG and PLAYWRIGHT_GIFT_TOKEN to enable.'
    );

    // Even with a saturated meter, ?gift=TOKEN should let the reader through.
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${now.getMonth()}`;
    await page.addInitScript((value) => {
      try {
        window.localStorage.setItem('ikt_reads', value);
      } catch { /* ignore */ }
    }, JSON.stringify({ month: currentMonth, slugs: ['x', 'y', 'z', 'q', 'r'] }));

    await page.goto(`/${PAYWALLED_SLUG}?gift=${GIFT_TOKEN}`);

    // No paywall CTA should be visible. We do a soft check on the page text —
    // the article body should render its <article> region.
    await expect(page.locator('article, main')).toBeVisible();
    await expect(page.locator('body')).not.toContainText(
      /(اشترك للقراءة|paywall_teaser|paywalled_teaser)/i
    );
  });
});
