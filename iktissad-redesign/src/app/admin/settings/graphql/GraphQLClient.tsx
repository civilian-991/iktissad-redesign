'use client';

/**
 * GraphQL API Settings UI
 *
 * Shows the GraphQL endpoint URL, API key selector, example queries,
 * and a cURL snippet. Arabic RTL layout following the admin design system.
 */

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  Braces,
  Copy,
  Check,
  Key,
  Terminal,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  is_active: boolean;
  created_at: string;
}

interface GraphQLClientProps {
  apiKeys: ApiKeyRow[];
}

// ── Example queries ───────────────────────────────────────────────────────────

const EXAMPLE_QUERIES = [
  {
    key: 'latestArticles',
    title: 'آخر المقالات',
    description: 'احصل على آخر 10 مقالات منشورة',
    query: `query {
  latestArticles(limit: 10) {
    title
    slug
    publishedAt
    url
    section {
      name
    }
  }
}`,
  },
  {
    key: 'articleBySlug',
    title: 'مقال بالـ slug',
    description: 'احصل على مقال محدد بمعرّفه',
    query: `query {
  article(slug: "اسم-المقال") {
    id
    title
    excerpt
    content
    publishedAt
    authorName
    tags
    section {
      name
      slug
    }
  }
}`,
  },
  {
    key: 'paginatedArticles',
    title: 'مقالات مع ترقيم الصفحات',
    description: 'قائمة مقالات مع فلترة وترقيم',
    query: `query {
  articles(page: 1, limit: 20, section: "economy") {
    data {
      title
      slug
      publishedAt
      url
    }
    total
    page
    limit
    hasMore
  }
}`,
  },
  {
    key: 'searchArticles',
    title: 'البحث في المقالات',
    description: 'بحث نصي في العناوين والمقتطفات',
    query: `query {
  searchArticles(query: "النفط", limit: 10) {
    title
    slug
    excerpt
    url
  }
}`,
  },
  {
    key: 'sections',
    title: 'الأقسام والقطاعات',
    description: 'قائمة بجميع الأقسام والقطاعات الاقتصادية',
    query: `query {
  sections {
    id
    slug
    name
    nameEn
  }
  sectors {
    id
    slug
    name
    icon
    color
  }
}`,
  },
  {
    key: 'series',
    title: 'الملفات التحريرية',
    description: 'قائمة الملفات مع تفاصيل المقالات',
    query: `query {
  series {
    id
    slug
    title
    articleCount
  }
  seriesBySlug(slug: "اسم-الملف") {
    title
    description
    articles {
      orderIndex
      title
      slug
      url
    }
  }
}`,
  },
];

// ── Copy helper ───────────────────────────────────────────────────────────────

function useCopy() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      toast.success('تم النسخ إلى الحافظة');
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2000);
    });
  }

  return { copy, copiedKey };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GraphQLClient({ apiKeys }: GraphQLClientProps) {
  const { copy, copiedKey } = useCopy();
  const [selectedKeyId, setSelectedKeyId] = useState<string>(apiKeys[0]?.id ?? '');
  const [expandedQuery, setExpandedQuery] = useState<string | null>('latestArticles');

  const selectedKey = apiKeys.find((k) => k.id === selectedKeyId);

  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://your-domain.com';

  const graphqlEndpoint = `${origin}/api/graphql`;

  const curlSnippet =
    `curl -X POST ${graphqlEndpoint} \\\n` +
    `  -H "Content-Type: application/json" \\\n` +
    `  -H "Authorization: Bearer YOUR_API_KEY" \\\n` +
    `  -d '{"query":"{ latestArticles(limit: 5) { title slug url } }"}'`;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center">
          <Braces size={20} className="text-gold" />
        </div>
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white">
            GraphQL API
          </h1>
          <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
            واجهة برمجية مرنة للاستعلام عن محتوى إقتصاد
          </p>
        </div>
      </div>

      {/* Endpoint URL Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6 space-y-4"
      >
        <h2 className="text-white font-[family-name:var(--font-display)] font-semibold flex items-center gap-2">
          <Terminal size={16} className="text-gold" />
          عنوان الـ Endpoint
        </h2>

        <div className="flex items-center gap-3 bg-white/5 border border-gold/10 rounded-xl px-4 py-3">
          <code className="flex-1 text-gold font-mono text-sm break-all" dir="ltr">
            {graphqlEndpoint}
          </code>
          <button
            onClick={() => copy(graphqlEndpoint, 'endpoint')}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all shrink-0"
            title="نسخ الرابط"
          >
            {copiedKey === 'endpoint' ? (
              <Check size={16} className="text-gold" />
            ) : (
              <Copy size={16} />
            )}
          </button>
        </div>

        <div className="flex items-start gap-3 p-3 bg-gold/5 border border-gold/20 rounded-xl">
          <span className="text-gold text-sm mt-0.5">ℹ</span>
          <p className="text-white/60 text-sm font-[family-name:var(--font-display)]">
            يدعم الـ Endpoint كلاً من{' '}
            <code className="text-gold bg-white/5 px-1 rounded">GET</code> و{' '}
            <code className="text-gold bg-white/5 px-1 rounded">POST</code>.
            يتطلب كل طلب رأس{' '}
            <code className="text-gold bg-white/5 px-1 rounded">Authorization: Bearer &lt;مفتاح_API&gt;</code>.
            {process.env.NODE_ENV === 'development' && (
              <span className="block mt-1 text-profit">
                GraphiQL Playground متاح في بيئة التطوير عبر فتح الرابط أعلاه في المتصفح.
              </span>
            )}
          </p>
        </div>
      </motion.div>

      {/* API Key Selector */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6 space-y-4"
      >
        <h2 className="text-white font-[family-name:var(--font-display)] font-semibold flex items-center gap-2">
          <Key size={16} className="text-gold" />
          مفتاح API المستخدم
        </h2>

        {apiKeys.length === 0 ? (
          <div className="p-4 bg-white/5 border border-gold/10 rounded-xl text-white/50 text-sm font-[family-name:var(--font-display)]">
            لا توجد مفاتيح API نشطة. أنشئ مفتاحاً من صفحة{' '}
            <Link href="/admin/settings" className="text-gold hover:underline">
              الإعدادات → API
            </Link>
            .
          </div>
        ) : (
          <div className="space-y-3">
            <select
              value={selectedKeyId}
              onChange={(e) => setSelectedKeyId(e.target.value)}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/30 transition-colors"
            >
              {apiKeys.map((k) => (
                <option key={k.id} value={k.id} className="bg-midnight">
                  {k.name} — {k.key_prefix}****
                </option>
              ))}
            </select>

            {selectedKey && (
              <div className="flex flex-wrap gap-2">
                {selectedKey.scopes.map((scope) => (
                  <span
                    key={scope}
                    className="px-2 py-1 bg-gold/10 text-gold text-xs rounded-lg font-mono"
                  >
                    {scope}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Example Queries */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6 space-y-3"
      >
        <h2 className="text-white font-[family-name:var(--font-display)] font-semibold flex items-center gap-2">
          <Braces size={16} className="text-gold" />
          أمثلة على الاستعلامات
        </h2>

        <div className="space-y-2">
          {EXAMPLE_QUERIES.map((example) => {
            const isOpen = expandedQuery === example.key;
            return (
              <div
                key={example.key}
                className="border border-gold/10 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setExpandedQuery(isOpen ? null : example.key)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3 text-right">
                    <code className="text-gold text-sm font-mono">{example.title}</code>
                    <span className="text-white/50 text-sm font-[family-name:var(--font-display)] hidden md:block">
                      — {example.description}
                    </span>
                  </div>
                  {isOpen ? (
                    <ChevronUp size={16} className="text-white/40 shrink-0" />
                  ) : (
                    <ChevronDown size={16} className="text-white/40 shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="border-t border-gold/10 bg-white/2">
                    <div className="relative">
                      <pre
                        className="p-4 text-sm font-mono text-white/80 overflow-x-auto bg-obsidian/50"
                        dir="ltr"
                      >
                        {example.query}
                      </pre>
                      <button
                        onClick={() => copy(example.query, `query-${example.key}`)}
                        className="absolute top-3 left-3 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all"
                        title="نسخ الاستعلام"
                      >
                        {copiedKey === `query-${example.key}` ? (
                          <Check size={16} className="text-gold" />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* cURL Test Snippet */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6 space-y-4"
      >
        <h2 className="text-white font-[family-name:var(--font-display)] font-semibold flex items-center gap-2">
          <Terminal size={16} className="text-gold" />
          اختبار بـ cURL
        </h2>

        <p className="text-white/60 text-sm font-[family-name:var(--font-display)]">
          استبدل <code className="text-gold bg-white/5 px-1 rounded">YOUR_API_KEY</code> بمفتاح API الفعلي.
        </p>

        <div className="relative">
          <pre
            className="bg-obsidian border border-gold/10 rounded-xl p-4 text-sm font-mono text-white/80 overflow-x-auto"
            dir="ltr"
          >
            {curlSnippet}
          </pre>
          <button
            onClick={() => copy(curlSnippet, 'curl')}
            className="absolute top-3 left-3 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all"
            title="نسخ الأمر"
          >
            {copiedKey === 'curl' ? (
              <Check size={16} className="text-gold" />
            ) : (
              <Copy size={16} />
            )}
          </button>
        </div>
      </motion.div>

      {/* Useful Links */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6 space-y-4"
      >
        <h2 className="text-white font-[family-name:var(--font-display)] font-semibold">
          روابط مفيدة
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            {
              label: 'توثيق GraphQL الرسمي',
              href: 'https://graphql.org/learn/',
            },
            {
              label: 'graphql-yoga — الوثائق',
              href: 'https://the-guild.dev/graphql/yoga-server/docs',
            },
            {
              label: 'إدارة مفاتيح API',
              href: '/admin/settings',
            },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              target={link.href.startsWith('http') ? '_blank' : '_self'}
              rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-gold/10 rounded-xl text-white/70 hover:text-white hover:border-gold/30 transition-all text-sm font-[family-name:var(--font-display)]"
            >
              <ExternalLink size={14} className="text-gold shrink-0" />
              {link.label}
            </a>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
