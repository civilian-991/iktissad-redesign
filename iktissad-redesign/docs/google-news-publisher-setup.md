# Google News Publisher Center — Setup Guide

## Prerequisites (already implemented)

- [x] RSS feed at `/feed.xml` with proper `<pubDate>`, `<author>`, `<category>`, and image `<enclosure>`
- [x] News-sitemap at `/news-sitemap.xml` following Google News sitemap protocol
- [x] Only articles from last 48 hours in news-sitemap
- [x] `publication_date`, `title`, `keywords` included per article
- [x] robots.txt allows Googlebot and Google-News with sitemap references
- [x] Permanent URL slugs (no ID-based URLs)
- [x] Language set to `ar` in both feed and sitemap

## Publisher Center Configuration Steps

1. **Go to**: https://publishercenter.google.com
2. **Add publication**:
   - Publication name: `الإقتصاد والأعمال`
   - Website URL: `https://www.iktissadonline.com`
   - Primary language: Arabic (ar)
   - Country: Lebanon / MENA region
3. **Content settings**:
   - RSS feed URL: `https://www.iktissadonline.com/feed.xml`
   - News sitemap URL: `https://www.iktissadonline.com/news-sitemap.xml`
   - Content labels: Economy, Finance, Business, Investment, Technology
4. **Visual assets**:
   - Logo (rectangle): Upload from `/public/logo.png` (200x60)
   - Logo (square): Upload from `/public/icon-192x192.png` (192x192)
5. **Verify ownership**:
   - Use DNS TXT record method or HTML meta tag
   - Alternative: Already verified via Google Search Console
6. **Submit for review**

## Compliance Checklist

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Unique permanent URLs | ✅ | `/[slug]` pattern with `slug` UNIQUE constraint |
| Publication date in feed | �� | `<pubDate>` in RFC 2822 format |
| Author attribution | ✅ | `<author>` tag with name |
| High-res images (min 80k px) | ✅ | Featured images > 1200x630 |
| Language declaration | ✅ | `xml:lang="ar"` + `<language>ar</language>` |
| No paywalled content in feed | ✅ | Only `status=published` articles in feed |
| News sitemap < 48h articles | ✅ | Cutoff filter in `/news-sitemap.xml` |
| Content labels/categories | ✅ | `<category>` tags from sections |
| Original reporting | ✅ | Content policy requirement (editorial) |

## RSS Feed Verification

Test the feed at:
- https://validator.w3.org/feed/ — enter `https://www.iktissadonline.com/feed.xml`
- Google Search Console → Sitemaps → submit `news-sitemap.xml`

## Section-specific Feeds

Available for Google News section targeting:
- `/feed/sections/[slug]` — per-section feeds (economy, technology, etc.)
- `/feed/countries/[slug]` — per-country feeds (saudi-arabia, uae, etc.)
