import { SITE_URL } from '@/lib/site-config';
/**
 * Social Media Auto-Posting Utility
 *
 * Posts article content to connected social platforms (Twitter/X, LinkedIn, Telegram).
 * LinkedIn and Telegram copy is AI-written (src/lib/ai/social-content.ts) when
 * the model is reachable; otherwise, and always for X, a template is used.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { generateText } from 'ai';
import {
  SOCIAL_CONTENT_MODEL,
  buildSocialSystem,
  buildSocialPrompt,
} from '@/lib/ai/social-content';

const BASE_URL = SITE_URL;

export interface PostResult {
  platform: string;
  status: 'sent' | 'failed';
  postUrl?: string;
  error?: string;
}

interface SocialAccountRow {
  id: string;
  platform: string;
  account_name: string;
  access_token: string;
  active: boolean;
}

interface ArticleForPost {
  id: string;
  title: string;
  excerpt: string;
  slug: string;
  featured_image: string;
  tags: string[];
}

/**
 * Post an article to all active social accounts or specified platforms.
 */
export async function postArticleToSocial(
  articleId: string,
  platforms?: string[]
): Promise<PostResult[]> {
  const admin = createAdminClient();

  // Fetch article
  const { data: article } = await (admin as any)
    .from('articles')
    .select('id, title, excerpt, slug, featured_image, tags')
    .eq('id', articleId)
    .single();

  if (!article) {
    return [{ platform: 'all', status: 'failed', error: 'Article not found' }];
  }

  // Fetch active social accounts
  let query = (admin as any)
    .from('social_accounts')
    .select('id, platform, account_name, access_token, active')
    .eq('active', true);

  if (platforms && platforms.length > 0) {
    query = query.in('platform', platforms);
  }

  const { data: accounts } = await query;
  if (!accounts || accounts.length === 0) {
    return [{ platform: 'all', status: 'failed', error: 'No active social accounts configured' }];
  }

  // Generate social copy (try AI endpoint, fall back to simple template)
  const socialCopy = await generateSocialCopy(article as ArticleForPost);

  // Post to each account
  const results: PostResult[] = [];

  for (const account of accounts as SocialAccountRow[]) {
    const content = socialCopy[account.platform] || socialCopy.default;
    const result = await postToPlatform(account, content, article as ArticleForPost);
    results.push(result);

    // Log to social_post_log
    await (admin as any).from('social_post_log').insert({
      article_id: articleId,
      platform: account.platform,
      post_content: content,
      post_url: result.postUrl ?? null,
      status: result.status,
      error_message: result.error ?? null,
      posted_at: result.status === 'sent' ? new Date().toISOString() : null,
    });
  }

  return results;
}

/** AI copy for one platform, or null if the model call fails. */
async function generateAiCopy(
  platform: 'linkedin' | 'telegram',
  article: ArticleForPost
): Promise<string | null> {
  try {
    const { text } = await generateText({
      model: SOCIAL_CONTENT_MODEL,
      system: buildSocialSystem(platform),
      prompt: buildSocialPrompt({
        articleId: article.id,
        platform,
        title: article.title,
        excerpt: article.excerpt ?? '',
        content: '',
      }),
      maxOutputTokens: 800,
    });
    return text.trim() || null;
  } catch {
    return null;
  }
}

/** The Telegram prompt writes **bold** markdown; the bot sends HTML. */
function telegramMarkdownToHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
}

/**
 * Generate social media copy for an article. X gets a headline + link
 * (the AI writes a 5-tweet thread, and only a single tweet is posted).
 */
async function generateSocialCopy(
  article: ArticleForPost
): Promise<Record<string, string>> {
  const articleUrl = `${BASE_URL}/${article.slug}`;

  const hashtags = (article.tags ?? [])
    .slice(0, 3)
    .map(t => `#${t.replace(/\s+/g, '_')}`)
    .join(' ');

  const twitterText = `${article.title}\n\n${article.excerpt?.slice(0, 100) || ''}\n\n${articleUrl}\n\n${hashtags}`;

  const [aiLinkedin, aiTelegram] = await Promise.all([
    generateAiCopy('linkedin', article),
    generateAiCopy('telegram', article),
  ]);

  const linkedinText = aiLinkedin
    ? `${aiLinkedin}\n\n🔗 ${articleUrl}`
    : `📰 ${article.title}\n\n${article.excerpt || ''}\n\n🔗 ${articleUrl}\n\n${hashtags}`;
  const telegramText = aiTelegram
    ? `${telegramMarkdownToHtml(aiTelegram)}\n\n<a href="${articleUrl}">اقرأ المزيد</a>`
    : `<b>${article.title}</b>\n\n${article.excerpt || ''}\n\n<a href="${articleUrl}">اقرأ المزيد</a>`;

  return {
    twitter: twitterText,
    linkedin: linkedinText,
    telegram: telegramText,
    default: twitterText,
  };
}

/**
 * Post content to a specific platform via its API.
 * Currently implements request structure; real API calls require valid tokens.
 */
async function postToPlatform(
  account: SocialAccountRow,
  content: string,
  article: ArticleForPost
): Promise<PostResult> {
  const articleUrl = `${BASE_URL}/${article.slug}`;

  try {
    switch (account.platform) {
      case 'twitter':
        return await postToTwitter(account.access_token, content);

      case 'linkedin':
        return await postToLinkedIn(account.access_token, content, articleUrl, article);

      case 'telegram':
        return await postToTelegram(account.access_token, content, account.account_name);

      default:
        return { platform: account.platform, status: 'failed', error: `Unsupported platform: ${account.platform}` };
    }
  } catch (err) {
    return {
      platform: account.platform,
      status: 'failed',
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Post to Twitter/X via v2 API
 */
async function postToTwitter(
  accessToken: string,
  text: string
): Promise<PostResult> {
  const res = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: text.slice(0, 280) }),
  });

  if (!res.ok) {
    const err = await res.text();
    return { platform: 'twitter', status: 'failed', error: `Twitter API ${res.status}: ${err}` };
  }

  const data = await res.json();
  const tweetId = data?.data?.id;
  return {
    platform: 'twitter',
    status: 'sent',
    postUrl: tweetId ? `https://x.com/i/status/${tweetId}` : undefined,
  };
}

/**
 * Post to LinkedIn via Share API v2
 */
async function postToLinkedIn(
  accessToken: string,
  text: string,
  articleUrl: string,
  article: ArticleForPost
): Promise<PostResult> {
  // Get LinkedIn user URN from token
  const meRes = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  if (!meRes.ok) {
    return { platform: 'linkedin', status: 'failed', error: 'Failed to get LinkedIn user info' };
  }

  const meData = await meRes.json();
  const authorUrn = `urn:li:person:${meData.sub}`;

  const shareBody = {
    author: authorUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text },
        shareMediaCategory: 'ARTICLE',
        media: [
          {
            status: 'READY',
            originalUrl: articleUrl,
            title: { text: article.title },
            description: { text: article.excerpt?.slice(0, 200) || '' },
          },
        ],
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  };

  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(shareBody),
  });

  if (!res.ok) {
    const err = await res.text();
    return { platform: 'linkedin', status: 'failed', error: `LinkedIn API ${res.status}: ${err}` };
  }

  const postData = await res.json();
  return {
    platform: 'linkedin',
    status: 'sent',
    postUrl: postData?.id ? `https://www.linkedin.com/feed/update/${postData.id}` : undefined,
  };
}

/**
 * Post to Telegram via Bot API
 *
 * Exported so other server-side surfaces (e.g. the automation engine in
 * `src/lib/automations/engine.ts`) can reuse the same transport without
 * duplicating the fetch dance.
 */
export async function postToTelegram(
  botToken: string,
  text: string,
  channelName: string,
  parseMode: 'HTML' | 'MarkdownV2' | 'Markdown' | undefined = 'HTML'
): Promise<PostResult> {
  // Accept either a channel handle (@channel), a raw handle (channel) or a
  // numeric chat_id ("-1001234567890"). Only prefix '@' for word-style handles.
  const chatId = channelName.startsWith('@') || /^-?\d+$/.test(channelName)
    ? channelName
    : `@${channelName}`;

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      disable_web_page_preview: false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return { platform: 'telegram', status: 'failed', error: `Telegram API ${res.status}: ${err}` };
  }

  const data = await res.json();
  const messageId = data?.result?.message_id;
  return {
    platform: 'telegram',
    status: 'sent',
    postUrl: messageId ? `https://t.me/${channelName.replace('@', '')}/${messageId}` : undefined,
  };
}

/**
 * Auto-post hook: call this when an article transitions to 'published'.
 * Checks if auto_post is enabled for the article.
 */
export async function autoPostOnPublish(articleId: string): Promise<void> {
  const admin = createAdminClient();

  // Check if auto_post is enabled
  const { data: article } = await (admin as any)
    .from('articles')
    .select('auto_post')
    .eq('id', articleId)
    .single();

  if (!article || article.auto_post === false) return;

  // Check if already posted (prevent duplicates)
  const { count } = await (admin as any)
    .from('social_post_log')
    .select('id', { count: 'exact', head: true })
    .eq('article_id', articleId)
    .eq('status', 'sent');

  if ((count ?? 0) > 0) return; // Already posted

  // Fire and forget
  void postArticleToSocial(articleId).catch(console.error);
}
