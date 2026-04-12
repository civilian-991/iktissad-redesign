# API: AI

All routes under `/api/ai/`. All require authenticated admin session unless noted.

These routes call external AI providers (Claude/OpenAI) and return generated content.
They do NOT store results unless explicitly documented.

---

## `/api/ai/status`

### GET /api/ai/status
Check AI service availability and configured providers.

**Auth:** Required  
**Returns:** `{ providers: string[], available: boolean }`

---

## `/api/ai/agent`

### POST /api/ai/agent
Run a multi-step AI agent task (article research, fact-checking, etc.).

**Body:** `{ task: string, context?: object }`  
**Auth:** Required  
**Returns:** Streamed agent response or final result

---

## `/api/ai/stream-action`

### POST /api/ai/stream-action
Streamed AI action for real-time editor assistance.

**Body:** `{ action: string, content: string, options?: object }`  
**Auth:** Required  
**Returns:** SSE stream of text chunks

---

## `/api/ai/generate-excerpt`

### POST /api/ai/generate-excerpt
Generate an Arabic excerpt from article body.

**Body:** `{ articleId: string }` or `{ content: string }`  
**Tables:** articles (SELECT if articleId provided)  
**Auth:** Required  
**Returns:** `{ excerpt: string }`

---

## `/api/ai/headline-variants`

### POST /api/ai/headline-variants
Generate alternative headline options for an article.

**Body:** `{ title: string, excerpt?: string, count?: number }`  
**Auth:** Required  
**Returns:** `{ variants: string[] }`

---

## `/api/ai/translate`

### POST /api/ai/translate
Translate Arabic content to English (or vice versa).

**Body:** `{ text: string, from: 'ar'|'en', to: 'ar'|'en' }`  
**Auth:** Required  
**Returns:** `{ translation: string }`

---

## `/api/ai/seo-analysis`

### POST /api/ai/seo-analysis
Analyze article for SEO quality and suggest improvements.

**Body:** `{ articleId: string }` or `{ title, content, excerpt }`  
**Tables:** articles (SELECT if articleId provided)  
**Auth:** Required  
**Returns:** `{ score: number, suggestions: string[], metaTitle?: string, metaDescription?: string }`

---

## `/api/ai/seo-competitor-gap`

### POST /api/ai/seo-competitor-gap
Identify keyword gaps vs. competitors for a topic.

**Body:** `{ topic: string, existingContent?: string }`  
**Auth:** Required  
**Returns:** `{ gaps: string[], opportunities: string[] }`

---

## `/api/ai/seo-internal-links`

### POST /api/ai/seo-internal-links
Suggest internal link opportunities for an article.

**Body:** `{ articleId: string, content: string }`  
**Tables:** articles (SELECT for candidates)  
**Auth:** Required  
**Returns:** `{ suggestions: Array<{ text, url, reason }> }`

---

## `/api/ai/seo-conversion-signal`

### POST /api/ai/seo-conversion-signal
Analyze article for paywall conversion signals and suggest improvements.

**Body:** `{ content: string }`  
**Auth:** Required

---

## `/api/ai/article-brief`

### POST /api/ai/article-brief
Generate a structured editorial brief for a new article.

**Body:** `{ topic: string, section?: string, angle?: string }`  
**Auth:** Required  
**Returns:** `{ brief: { outline, keyPoints, sources, wordCount } }`

---

## `/api/ai/version-summary`

### POST /api/ai/version-summary
Summarize the changes between two article versions.

**Body:** `{ oldContent: string, newContent: string }`  
**Auth:** Required  
**Returns:** `{ summary: string }`

---

## `/api/ai/alt-text`

### POST /api/ai/alt-text
Generate alt text for an image (Arabic and English).

**Body:** `{ imageUrl: string, context?: string }`  
**Auth:** Required  
**Returns:** `{ alt: string, alt_en: string }`

---

## `/api/ai/media-tags`

### POST /api/ai/media-tags
Auto-tag a media item with descriptive tags.

**Body:** `{ imageUrl: string }`  
**Tables:** media (UPDATE to store tags)  
**Auth:** Required  
**Returns:** `{ tags: string[] }`

---

## `/api/ai/media-search`

### POST /api/ai/media-search
Semantic search across media library using natural language query.

**Body:** `{ query: string, limit?: number }`  
**Tables:** media (SELECT with vector similarity)  
**Auth:** Required  
**Returns:** `{ results: MediaItem[] }`

---

## `/api/ai/geo-analysis`

### POST /api/ai/geo-analysis
Analyze geographic distribution of an article's readership.

**Body:** `{ articleId: string }`  
**Tables:** article_reads (SELECT)  
**Auth:** Required

---

## `/api/ai/paywall-suggestions`

### POST /api/ai/paywall-suggestions
Suggest which articles should be paywalled based on content value signals.

**Tables:** articles (SELECT)  
**Auth:** Required

---

## `/api/ai/performance-recommendations`

### POST /api/ai/performance-recommendations
AI-generated content performance recommendations based on analytics.

**Tables:** articles (SELECT), article_reads (SELECT)  
**Auth:** Required

---

## `/api/ai/social-content`

### POST /api/ai/social-content
Generate social media post copy for an article (Twitter/X, LinkedIn, Instagram).

**Body:** `{ articleId: string, platforms: string[] }`  
**Tables:** articles (SELECT)  
**Auth:** Required  
**Returns:** `{ posts: Record<platform, string> }`

---

## `/api/ai/embed-article`

### POST /api/ai/embed-article
Generate and store vector embedding for an article (for semantic search).

**Body:** `{ articleId: string }`  
**Tables:** articles (SELECT + UPDATE embedding column)  
**Auth:** Required

---

## `/api/ai/auto-tag`

### POST /api/ai/auto-tag
Extract entities (people, companies, economic topics, countries) from article content and suggest Arabic tags. Uses Claude Haiku. Does NOT persist tags — returns suggestions for editor review.

**Body:** `{ content: string, title: string, existingTags?: string[] }`  
**Auth:** Required  
**AI model:** claude-haiku-4-5-20251001 (max 512 tokens, content truncated to 4000 chars)  
**Returns:** `{ data: { tags: string[] } }` — 5-10 concise Arabic tags  
**Env:** `ANTHROPIC_API_KEY` (503 if missing)

---

## `/api/ai/summarize`

### POST /api/ai/summarize
Generate a 2-3 sentence TLDR summary in both Arabic and English. **Persists** the summaries to the `articles` table (`summary`, `summary_en` columns). Generates both languages in parallel via two Claude Haiku calls.

**Body:** `{ articleId: string, content: string, title: string }`  
**Tables:** articles (UPDATE `summary` + `summary_en`)  
**Auth:** Required  
**AI model:** claude-haiku-4-5-20251001 (max 512 tokens per call, content truncated to 5000 chars)  
**Returns:** `{ data: { summary: string, summaryEn: string } }`  
**Env:** `ANTHROPIC_API_KEY` (503 if missing)

---

## `/api/ai/fact-check`

### POST /api/ai/fact-check
Analyze article content for verifiable claims (numbers, statistics, attributions) and return confidence levels with suggested authoritative sources. Advisory-only — does NOT modify or auto-approve content. Uses Claude Sonnet for higher reasoning quality.

**Body:** `{ content: string, title: string }`  
**Auth:** Required  
**AI model:** claude-sonnet-4-5-20250929 (max 2048 tokens, HTML stripped, content truncated to 6000 chars)  
**Returns:** `{ data: { claims: FactCheckClaim[], checkedAt: string } }`  
**FactCheckClaim shape:** `{ claim: string, confidence: number (0–1), priority: 'high'|'medium'|'low', suggestedSources: string[], note: string }`  
**Max claims:** 8  
**Env:** `ANTHROPIC_API_KEY` (503 if missing)

---

## `/api/ai/social-card`

### POST /api/ai/social-card
Generate branded social media card images (PNG) for Twitter, LinkedIn, and WhatsApp using `next/og` (Satori). Renders IKTISSAD-branded dark cards with article title (RTL), accent color bar, and optional background image. Uploads all 3 sizes to Supabase Storage and returns public URLs.

**Body:** `{ articleId: string, title: string, featuredImage?: string, accentColor?: string }`  
**Tables:** — (no DB read/write)  
**Storage:** media bucket, path `social-cards/{articleId}/{platform}-{timestamp}.png` (upsert)  
**Auth:** Required  
**Card sizes:** Twitter 1200×628, LinkedIn 1200×627, WhatsApp 1200×630  
**Returns:** `{ data: { twitter: string, linkedin: string, whatsapp: string } }` — public URLs  
**Defaults:** accentColor = `#c9a84c`
