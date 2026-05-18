import { describe, it, expect } from "vitest";
import { sanitizeArticleHtml, sanitizeLiveBlogHtml } from "./sanitize";

describe("sanitizeArticleHtml", () => {
  it("strips <script> tags entirely", () => {
    const out = sanitizeArticleHtml(
      `<p>hello</p><script>alert(1)</script><p>world</p>`
    );
    expect(out).not.toContain("<script");
    expect(out).not.toContain("alert(1)");
    expect(out).toContain("<p>hello</p>");
    expect(out).toContain("<p>world</p>");
  });

  it("strips <style> tags entirely", () => {
    const out = sanitizeArticleHtml(
      `<p>x</p><style>body{display:none}</style><p>y</p>`
    );
    expect(out).not.toContain("<style");
    expect(out).not.toContain("display:none");
  });

  it("strips inline event handlers from <img>", () => {
    const out = sanitizeArticleHtml(`<img src="x" onerror="alert(1)">`);
    expect(out).toContain("<img");
    expect(out).toContain('src="x"');
    expect(out).not.toContain("onerror");
    expect(out).not.toContain("alert(1)");
  });

  it("strips inline event handlers from arbitrary tags", () => {
    const out = sanitizeArticleHtml(`<p onclick="alert(1)">hi</p>`);
    expect(out).toContain("<p");
    expect(out).not.toContain("onclick");
    expect(out).not.toContain("alert(1)");
  });

  it("rewrites/drops <a href=\"javascript:...\">", () => {
    const out = sanitizeArticleHtml(
      `<a href="javascript:alert(1)">click</a>`
    );
    expect(out).not.toContain("javascript:");
    expect(out).not.toContain("alert(1)");
    // The link text survives even if the href is removed.
    expect(out).toContain("click");
  });

  it("keeps safe http(s) and mailto links", () => {
    const out = sanitizeArticleHtml(
      `<a href="https://example.com">a</a><a href="mailto:x@y.com">b</a>`
    );
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain('href="mailto:x@y.com"');
  });

  it("adds rel=noopener noreferrer when target=_blank is set", () => {
    const out = sanitizeArticleHtml(
      `<a href="https://example.com" target="_blank">a</a>`
    );
    expect(out).toContain('target="_blank"');
    expect(out).toMatch(/rel="[^"]*noopener[^"]*"/);
    expect(out).toMatch(/rel="[^"]*noreferrer[^"]*"/);
  });

  it("preserves <bdi> tags used for bidi isolation", () => {
    const out = sanitizeArticleHtml(`<p><bdi dir="ltr">Apple</bdi></p>`);
    expect(out).toContain('<bdi dir="ltr">Apple</bdi>');
  });

  it("preserves <span dir=\"ltr\"> wrappers", () => {
    const out = sanitizeArticleHtml(`<p><span dir="ltr">USD</span></p>`);
    expect(out).toContain('<span dir="ltr">USD</span>');
  });

  it("preserves Unicode bidi control marks in text nodes", () => {
    // FSI = U+2068, PDI = U+2069
    const input = `<p>⁨Apple⁩ شركة</p>`;
    const out = sanitizeArticleHtml(input);
    expect(out).toContain("⁨");
    expect(out).toContain("⁩");
  });

  it("leaves Arabic text untouched", () => {
    const arabic =
      "<p>الاقتصاد العربي ينمو بمعدل ثابت رغم التحديات الإقليمية.</p>";
    const out = sanitizeArticleHtml(arabic);
    expect(out).toContain(
      "الاقتصاد العربي ينمو بمعدل ثابت رغم التحديات الإقليمية."
    );
  });

  it("allows TipTap structural tags (headings, lists, blockquote, code, figure)", () => {
    const html = `
      <h2>Heading</h2>
      <h3>Sub</h3>
      <ul><li>one</li><li>two</li></ul>
      <ol><li>1</li></ol>
      <blockquote>quote</blockquote>
      <pre><code>code</code></pre>
      <figure><img src="https://x.test/i.png" alt="x"><figcaption>cap</figcaption></figure>
    `;
    const out = sanitizeArticleHtml(html);
    expect(out).toContain("<h2>");
    expect(out).toContain("<h3>");
    expect(out).toContain("<ul>");
    expect(out).toContain("<ol>");
    expect(out).toContain("<blockquote>");
    expect(out).toContain("<pre>");
    expect(out).toContain("<code>");
    expect(out).toContain("<figure>");
    expect(out).toContain("<figcaption>");
  });

  it("drops disallowed iframes but allows youtube/vimeo embeds", () => {
    const evilIframe = `<iframe src="https://evil.test/x"></iframe>`;
    const ytIframe = `<iframe src="https://www.youtube.com/embed/abc"></iframe>`;
    const evilOut = sanitizeArticleHtml(evilIframe);
    const ytOut = sanitizeArticleHtml(ytIframe);
    expect(evilOut).not.toContain("evil.test");
    expect(evilOut).not.toContain("<iframe");
    expect(ytOut).toContain('<iframe src="https://www.youtube.com/embed/abc"');
  });

  it("strips data: URLs from <a href> (only http/https/mailto are allowed)", () => {
    const out = sanitizeArticleHtml(
      `<a href="data:text/html,<script>alert(1)</script>">x</a>`
    );
    expect(out).not.toContain("data:");
    expect(out).not.toContain("alert(1)");
  });
});

describe("sanitizeLiveBlogHtml", () => {
  it("strips <script> tags entirely", () => {
    const out = sanitizeLiveBlogHtml(`<p>x</p><script>alert(1)</script>`);
    expect(out).not.toContain("<script");
    expect(out).not.toContain("alert(1)");
  });

  it("drops <img> (not on live-blog allowlist) but keeps text", () => {
    const out = sanitizeLiveBlogHtml(
      `<p>before</p><img src="x" onerror="alert(1)"><p>after</p>`
    );
    expect(out).not.toContain("<img");
    expect(out).not.toContain("onerror");
    expect(out).toContain("before");
    expect(out).toContain("after");
  });

  it("drops javascript: hrefs", () => {
    const out = sanitizeLiveBlogHtml(`<a href="javascript:alert(1)">x</a>`);
    expect(out).not.toContain("javascript:");
    expect(out).not.toContain("alert(1)");
    expect(out).toContain("x");
  });

  it("preserves bdi/span bidi wrappers", () => {
    const out = sanitizeLiveBlogHtml(
      `<p><bdi dir="ltr">USD</bdi> <span dir="ltr">100</span></p>`
    );
    expect(out).toContain('<bdi dir="ltr">USD</bdi>');
    expect(out).toContain('<span dir="ltr">100</span>');
  });

  it("preserves Unicode bidi marks", () => {
    const out = sanitizeLiveBlogHtml(`<p>⁨x⁩ ع</p>`);
    expect(out).toContain("⁨");
    expect(out).toContain("⁩");
  });

  it("leaves Arabic text untouched", () => {
    const out = sanitizeLiveBlogHtml("<p>تحديث مباشر: السوق يرتفع.</p>");
    expect(out).toContain("تحديث مباشر: السوق يرتفع.");
  });
});
