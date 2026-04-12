# Utility: Social Posting

File: `src/lib/social-posting.ts`

Automated social media posting for published articles. Posts to Twitter/X, LinkedIn, and Telegram via their respective APIs.

---

## Key exports

| Export | Description |
|--------|-------------|
| `postArticleToSocial(articleId, platforms?)` | Post article to all active social accounts (or specified platforms) |
| `autoPostOnPublish(articleId)` | Hook called when article transitions to 'published'; checks `auto_post` flag |

---

## Flow

1. Fetch article from DB (title, excerpt, slug, featured_image, tags)
2. Fetch active social accounts from `social_accounts` table
3. Generate social copy (tries `/api/ai/social-content` first, falls back to template)
4. Post to each platform via their API
5. Log results to `social_post_log` table

---

## Platform API integrations

| Platform | API | Token format |
|----------|-----|--------------|
| Twitter/X | `POST https://api.twitter.com/2/tweets` | OAuth 2.0 Bearer token |
| LinkedIn | `POST https://api.linkedin.com/v2/ugcPosts` | OAuth 2.0 Bearer token |
| Telegram | `POST https://api.telegram.org/bot{token}/sendMessage` | Bot token |

---

## Auto-post trigger

Called from:
- `POST /api/articles` (on create with status='published')
- `PUT /api/articles/[id]` (on status transition to 'published')

Checks:
- `articles.auto_post` must be true (default)
- No existing 'sent' entries in `social_post_log` for this article (prevents duplicates)

---

## Dependencies

- `src/lib/supabase/admin.ts` — for DB access
- `/api/ai/social-content` — for AI-generated copy (optional, falls back to template)
