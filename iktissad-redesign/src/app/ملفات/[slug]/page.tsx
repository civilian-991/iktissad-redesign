import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BookOpen, ChevronLeft, Calendar, FolderOpen } from "lucide-react";

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchSeries(slug: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  try {
    const [seriesRes, articlesRes] = await Promise.all([
      fetch(`${baseUrl}/api/series/${slug}`, { next: { revalidate: 60 } }),
      fetch(`${baseUrl}/api/series/${slug}/articles`, { next: { revalidate: 60 } }),
    ]);
    if (!seriesRes.ok) return null;
    const seriesJson = await seriesRes.json();
    const articlesJson = articlesRes.ok ? await articlesRes.json() : { data: [] };
    return {
      series: seriesJson.data,
      articles: articlesJson.data ?? [],
    };
  } catch {
    return null;
  }
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await fetchSeries(slug);
  if (!result) return { title: "ملف غير موجود" };

  const { series } = result;
  return {
    title: `${series.title} | الملفات التحريرية`,
    description: series.description ?? series.titleEn ?? undefined,
    openGraph: {
      title: series.title,
      description: series.description ?? undefined,
      images: series.coverImage ? [series.coverImage] : [],
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("ar-SA-u-ca-gregory", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default async function SeriesLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await fetchSeries(slug);

  if (!result || !result.series) notFound();

  const { series, articles } = result;

  return (
    <div className="min-h-screen bg-obsidian" dir="rtl">
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        {series.coverImage ? (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${series.coverImage})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-obsidian/80 via-obsidian/70 to-obsidian" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-midnight to-obsidian" />
        )}

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-24 pb-16">
          {/* Back breadcrumb */}
          <Link
            href="/news"
            className="inline-flex items-center gap-2 text-white/50 hover:text-gold transition-colors text-sm font-[family-name:var(--font-display)] mb-8"
          >
            <ChevronLeft size={16} />
            العودة إلى الأخبار
          </Link>

          {/* Label */}
          <div className="flex items-center gap-2 mb-4">
            <span className="flex items-center gap-1.5 text-xs font-[family-name:var(--font-display)] font-bold text-gold bg-gold/10 border border-gold/20 px-3 py-1.5 rounded-full">
              <FolderOpen size={12} />
              ملف تحريري
            </span>
            {series.status === "archived" && (
              <span className="text-xs font-[family-name:var(--font-display)] text-white/40 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                مؤرشف
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-[family-name:var(--font-display)] font-black text-white leading-tight mb-4">
            {series.title}
          </h1>

          {/* English subtitle */}
          {series.titleEn && (
            <p className="text-white/50 text-lg mb-4" dir="ltr">
              {series.titleEn}
            </p>
          )}

          {/* Description */}
          {series.description && (
            <p className="text-white/70 text-base font-[family-name:var(--font-display)] leading-relaxed max-w-2xl mb-6">
              {series.description}
            </p>
          )}

          {/* Meta strip */}
          <div className="flex items-center gap-4 text-sm text-white/50 font-[family-name:var(--font-display)]">
            <span className="flex items-center gap-1.5">
              <BookOpen size={14} />
              {articles.length} {articles.length === 1 ? "مقالة" : "مقالات"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Articles List ─────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {articles.length === 0 ? (
          <div className="text-center py-20">
            <FolderOpen size={48} className="mx-auto text-white/20 mb-4" />
            <p className="text-white/50 font-[family-name:var(--font-display)]">
              لا توجد مقالات في هذا الملف بعد
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {articles.map((item: {
              id: string;
              orderIndex: number;
              article?: {
                id: string;
                title: string;
                slug: string;
                excerpt?: string;
                publishedAt?: string;
              };
            }, _idx: number) => {
              const article = item.article;
              if (!article) return null;
              const partNumber = item.orderIndex + 1;

              return (
                <Link
                  key={item.id}
                  href={`/${article.slug}`}
                  className="group flex gap-4 p-5 bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-2xl hover:border-gold/30 hover:bg-midnight/70 transition-all"
                >
                  {/* Part badge */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gold/10 border border-gold/20 flex flex-col items-center justify-center">
                    <span className="text-gold/60 text-[10px] font-[family-name:var(--font-display)]">الجزء</span>
                    <span className="text-gold font-[family-name:var(--font-display)] font-black text-lg leading-none">
                      {partNumber}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-white font-[family-name:var(--font-display)] font-bold text-base sm:text-lg leading-snug group-hover:text-gold/90 transition-colors line-clamp-2 mb-1">
                      {article.title}
                    </h2>
                    {article.excerpt && (
                      <p className="text-white/50 text-sm font-[family-name:var(--font-display)] line-clamp-2 mb-2">
                        {article.excerpt}
                      </p>
                    )}
                    {article.publishedAt && (
                      <span className="flex items-center gap-1 text-xs text-white/30 font-[family-name:var(--font-display)]">
                        <Calendar size={11} />
                        {formatDate(article.publishedAt)}
                      </span>
                    )}
                  </div>

                  {/* Arrow */}
                  <div className="flex-shrink-0 self-center">
                    <ChevronLeft
                      size={20}
                      className="text-white/20 group-hover:text-gold/60 group-hover:-translate-x-1 transition-all"
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* English description at bottom if available */}
        {series.descriptionEn && (
          <div className="mt-12 pt-8 border-t border-gold/10">
            <p className="text-white/30 text-sm leading-relaxed" dir="ltr">
              {series.descriptionEn}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
