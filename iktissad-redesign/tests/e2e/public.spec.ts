import { test, expect } from '@playwright/test';

/**
 * Public-surface smoke tests.
 *
 * These cover the unauthenticated golden paths a search-engine crawler or a
 * first-time reader would hit. They intentionally stay shallow — we are only
 * verifying that each surface renders without exploding and serves the right
 * top-level signal (RTL on the homepage, an <article>/<h1> on an article page,
 * etc.). Deeper assertions belong in component-level tests.
 */
test.describe('Public site', () => {
  test('home renders in RTL with Arabic content', async ({ page }) => {
    await page.goto('/');

    // <html dir="rtl" lang="ar"> is set in src/app/layout.tsx.
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', /ar/);

    // Header is present and contains at least some Arabic glyph.
    const body = await page.locator('body').innerText();
    expect(body).toMatch(/[؀-ۿ]/);

    // Main content region exists.
    await expect(page.locator('main')).toBeVisible();
  });

  test('article listing page renders', async ({ page }) => {
    // /articles is the canonical listing. It renders even with zero rows.
    const response = await page.goto('/articles');
    expect(response?.status(), 'articles listing should respond 200').toBeLessThan(400);
    await expect(page.locator('main')).toBeVisible();
    // Either an article card list or an empty-state message — both fine.
    await expect(page).toHaveTitle(/الإقتصاد|آخر|Iktissad/i);
  });

  test('search page returns results UI', async ({ page }) => {
    await page.goto('/search?q=اقتصاد');

    // The search input should hydrate with the query string value.
    // We accept either a results grid or the empty-state messaging.
    await expect(page.locator('main')).toBeVisible();
    // Wait briefly for the debounced fetch to settle (no strict assertion on
    // count — DB may be empty in a fresh dev env).
    await page.waitForLoadState('networkidle').catch(() => { /* tolerate timeout */ });
    // At minimum, the page should not be a 5xx error page.
    await expect(page.locator('body')).not.toContainText(/Internal Server Error/i);
  });

  test('404 page shows the not-found state', async ({ page }) => {
    // Use a path nested under a known segment so we bypass the top-level
    // [slug] dynamic route (which would render its own "article not found"
    // state). /admin/<missing> resolves through the admin layout to the
    // app's global not-found.tsx.
    const response = await page.goto('/admin/this-segment-does-not-exist-xyz-1234');
    // Next.js dev sometimes returns 200 when rendering not-found.tsx, while
    // production returns 404. Accept either, but require the not-found UI.
    const status = response?.status() ?? 0;
    expect([200, 404]).toContain(status);

    // The not-found UI shows either the literal "404" (global not-found.tsx)
    // or "الصفحة غير موجودة" / "غير موجود" (Arabic not-found copy used in
    // admin/[slug] fallbacks). Accept any of them.
    await expect(page.locator('body')).toContainText(
      /(404|الصفحة غير موجودة|غير موجود|Not Found)/i,
      { timeout: 10_000 }
    );
  });

  test('sitemap.xml and RSS feed return valid XML', async ({ request }) => {
    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.status()).toBe(200);
    const sitemapBody = await sitemap.text();
    expect(sitemapBody).toMatch(/<\?xml/);
    expect(sitemapBody).toMatch(/<urlset|<sitemapindex/);

    const feed = await request.get('/feed.xml');
    expect(feed.status()).toBe(200);
    const feedBody = await feed.text();
    expect(feedBody).toMatch(/<\?xml/);
    expect(feedBody).toMatch(/<rss|<feed/);
  });
});
