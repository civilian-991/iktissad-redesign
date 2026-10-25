import { fetch } from 'expo/fetch';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://www.iktissad.com';
export const SITE_URL = BASE_URL;

/** Mirrors the website's camelCase `Article` (src/types/index.ts), only the fields the app reads. */
export type Article = {
  id: string;
  slug: string;
  title: string;
  titleEn?: string | null;
  excerpt?: string | null;
  excerptEn?: string | null;
  content?: string | null;
  contentEn?: string | null;
  deck?: string;
  deckEn?: string;
  featuredImage?: string | null;
  featuredImageCaption?: string;
  featuredImageCredit?: string;
  section?: string;
  sectionSlug?: string;
  author?: { name?: string; slug?: string; avatar?: string };
  publishedAt?: string;
  tags?: string[] | null;
};

export type Section = {
  id: string;
  slug: string;
  name: string;
  nameEn?: string | null;
  description?: string | null;
  descriptionEn?: string | null;
  articleCount?: number;
};

export type MagazineIssue = {
  id: string;
  issueNumber?: number;
  title?: string;
  titleEn?: string | null;
  coverImage?: string | null;
  publishDate?: string;
  pages?: number;
  pagesImages?: string[];
  pageLabels?: string[];
  publication?: string;
};

export type Page<T> = { items: T[]; page: number; totalPages: number; total: number };

type Envelope<T> = {
  data?: T;
  error?: string;
  pagination?: { page: number; pageSize: number; total: number; totalPages: number };
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function get<T>(path: string, params: Record<string, string | number | undefined> = {}) {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  const url = `${BASE_URL}/api/${path}${qs ? `?${qs}` : ''}`;
  let res: Response;
  try {
    res = (await fetch(url, { headers: { Accept: 'application/json' } })) as unknown as Response;
  } catch {
    throw new ApiError('Network error', 0);
  }
  const body = (await res.json().catch(() => ({}))) as Envelope<T>;
  if (!res.ok || body.data === undefined) {
    throw new ApiError(body.error ?? `HTTP ${res.status}`, res.status);
  }
  return body;
}

function toPage<T>(body: Envelope<T[]>, page: number): Page<T> {
  return {
    items: body.data ?? [],
    page,
    totalPages: body.pagination?.totalPages ?? page,
    total: body.pagination?.total ?? 0,
  };
}

// `fields=card` drops article bodies from list responses (see the website's
// src/lib/articles/card.ts). Older servers ignore it and still work.
const CARD = { fields: 'card' } as const;

export const api = {
  async topStories(pageSize = 6) {
    const body = await get<Article[]>('articles', {
      ...CARD,
      status: 'published',
      featured: 'true',
      sortBy: 'homepage',
      pageSize,
    });
    return body.data!;
  },

  async latest(page: number, pageSize = 20) {
    const body = await get<Article[]>('articles', { ...CARD, status: 'published', page, pageSize });
    return toPage(body, page);
  },

  async sections() {
    return (await get<Section[]>('sections')).data!;
  },

  async section(slug: string, page: number, pageSize = 20) {
    const body = await get<Section & { articles: Article[] }>(`sections/${encodeURIComponent(slug)}`, {
      ...CARD,
      page,
      pageSize,
    });
    const { articles, ...section } = body.data!;
    return { section, ...toPage({ ...body, data: articles }, page) };
  },

  async search(q: string, page: number, pageSize = 20) {
    return toPage(await get<Article[]>('search', { ...CARD, q, page, pageSize }), page);
  },

  async article(slug: string) {
    return (await get<Article>(`articles/${encodeURIComponent(slug)}`)).data!;
  },

  async issues(page: number, pageSize = 24) {
    const body = await get<MagazineIssue[]>('magazines', {
      ...CARD,
      status: 'published',
      publication: 'aiwa',
      page,
      pageSize,
    });
    return toPage(body, page);
  },

  async issue(id: string) {
    return (await get<MagazineIssue>(`magazines/${encodeURIComponent(id)}`)).data!;
  },

  async subscribeNewsletter(email: string, turnstileToken: string) {
    let res: Response;
    try {
      res = (await fetch(`${BASE_URL}/api/newsletter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email, turnstileToken }),
      })) as unknown as Response;
    } catch {
      throw new ApiError('Network error', 0);
    }
    // 409 already_subscribed is a success from the reader's point of view.
    if (res.ok || res.status === 409) return;
    const body = (await res.json().catch(() => ({}))) as Envelope<never>;
    throw new ApiError(body.error ?? `HTTP ${res.status}`, res.status);
  },
};

export function articleUrl(slug: string) {
  return `${SITE_URL}/${encodeURIComponent(slug)}`;
}
