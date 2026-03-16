'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Article, MagazineIssue } from '@/types';
import { BlockRenderer } from '@/components/magazine/BlockRenderer';
import ArticleAnalytics from '@/components/ArticleAnalytics';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ArticleReadingPageClientProps {
  article: Article;
  issue: Pick<MagazineIssue, 'id' | 'title' | 'issueNumber' | 'coverImage' | 'publishDate'> | null;
  issueId: string;
  relatedArticles: Article[];
}

// ── Reading progress bar ──────────────────────────────────────────────────────

function ReadingProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
    };

    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        insetInline: 0,
        height: '3px',
        background: 'rgba(24,59,78,0.08)',
        zIndex: 50,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${progress}%`,
          background: '#DDA853',
          transition: 'width 0.1s linear',
          transformOrigin: 'right',
        }}
      />
    </div>
  );
}

// ── Related article card ──────────────────────────────────────────────────────

function RelatedArticleCard({
  article,
  issueId,
}: {
  article: Article;
  issueId: string;
}) {
  return (
    <Link
      href={`/magazine/${issueId}/read/${article.id}`}
      className="card-editorial"
      style={{ display: 'block', textDecoration: 'none' }}
    >
      {article.featuredImage && (
        <div style={{ position: 'relative', height: '140px', overflow: 'hidden' }}>
          <Image
            src={article.featuredImage}
            alt={article.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            style={{ objectFit: 'cover' }}
          />
        </div>
      )}
      <div style={{ padding: '1rem' }}>
        <p
          style={{
            color: '#183B4E',
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            fontSize: '0.9rem',
            lineHeight: 1.4,
            margin: '0 0 0.5rem',
          }}
        >
          {article.title}
        </p>
        {article.excerpt && (
          <p
            style={{
              color: '#3D6E7E',
              fontFamily: 'var(--font-body)',
              fontSize: '0.8rem',
              lineHeight: 1.5,
              margin: 0,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {article.excerpt}
          </p>
        )}
      </div>
    </Link>
  );
}

// ── Main PageClient ───────────────────────────────────────────────────────────

export default function ArticleReadingPageClient({
  article,
  issue,
  issueId,
  relatedArticles,
}: ArticleReadingPageClientProps) {
  const articleEndRef = useRef<HTMLDivElement>(null);

  // Format publish date
  const formattedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('ar-SA-u-ca-gregory', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <>
      {/* Reading progress indicator */}
      <ReadingProgressBar />

      {/* Analytics tracker */}
      <ArticleAnalytics articleId={article.id} />

      <main
        dir="rtl"
        style={{
          minHeight: '100vh',
          background: '#F5EEDC',
          fontFamily: 'var(--font-body)',
        }}
      >
        {/* ── Top navigation breadcrumb ─────────────────────────────────── */}
        <nav
          style={{
            position: 'sticky',
            top: '3px', // below progress bar
            zIndex: 40,
            background: 'rgba(245,238,220,0.95)',
            backdropFilter: 'blur(8px)',
            borderBottom: '1px solid rgba(24,59,78,0.08)',
            padding: '0.75rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexWrap: 'wrap',
          }}
          aria-label="مسار التنقل"
        >
          <Link
            href="/magazine"
            style={{
              color: '#27548A',
              textDecoration: 'none',
              fontSize: '0.8rem',
              fontFamily: 'var(--font-body)',
            }}
          >
            المجلة
          </Link>
          <span style={{ color: '#6E98A2', fontSize: '0.8rem' }}>/</span>
          {issue && (
            <>
              <Link
                href={`/magazine/${issueId}`}
                style={{
                  color: '#27548A',
                  textDecoration: 'none',
                  fontSize: '0.8rem',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {issue.title}
              </Link>
              <span style={{ color: '#6E98A2', fontSize: '0.8rem' }}>/</span>
            </>
          )}
          <span
            style={{
              color: '#183B4E',
              fontSize: '0.8rem',
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '200px',
            }}
          >
            {article.title}
          </span>
        </nav>

        {/* ── Article container ─────────────────────────────────────────── */}
        <article
          style={{
            maxWidth: '720px',
            margin: '0 auto',
            padding: '2rem 1.5rem 4rem',
          }}
        >
          {/* Issue + section badges */}
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
            }}
          >
            {issue && (
              <span
                style={{
                  background: '#183B4E',
                  color: '#DDA853',
                  padding: '0.2rem 0.75rem',
                  fontSize: '0.7rem',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                العدد {issue.issueNumber}
              </span>
            )}
            {article.section && (
              <span
                style={{
                  background: 'rgba(24,59,78,0.08)',
                  color: '#183B4E',
                  padding: '0.2rem 0.75rem',
                  fontSize: '0.7rem',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                }}
              >
                {article.section}
              </span>
            )}
          </div>

          {/* Article title */}
          <h1
            style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 900,
              fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
              lineHeight: 1.2,
              color: '#183B4E',
              margin: '0 0 1rem',
              letterSpacing: '-0.02em',
            }}
          >
            {article.title}
          </h1>

          {/* Deck / standfirst */}
          {article.deck && (
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '1.15rem',
                lineHeight: 1.65,
                color: '#275A73',
                margin: '0 0 1.5rem',
                fontWeight: 400,
                borderInlineStart: '3px solid #DDA853',
                paddingInlineStart: '1rem',
              }}
            >
              {article.deck}
            </p>
          )}

          {/* Byline + date */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem 0',
              borderTop: '1px solid rgba(24,59,78,0.08)',
              borderBottom: '1px solid rgba(24,59,78,0.08)',
              marginBottom: '2rem',
            }}
          >
            {article.author.avatar && (
              <div
                style={{
                  position: 'relative',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                <Image
                  src={article.author.avatar}
                  alt={article.author.name}
                  fill
                  sizes="40px"
                  style={{ objectFit: 'cover' }}
                />
              </div>
            )}
            <div>
              {article.author.name && (
                <p
                  style={{
                    color: '#183B4E',
                    fontFamily: 'var(--font-body)',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    margin: '0 0 0.1rem',
                  }}
                >
                  {article.author.name}
                </p>
              )}
              {formattedDate && (
                <p
                  style={{
                    color: '#6E98A2',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.8rem',
                    margin: 0,
                  }}
                >
                  {formattedDate}
                </p>
              )}
            </div>
          </div>

          {/* Hero image */}
          {article.featuredImage && (
            <figure style={{ margin: '0 0 2.5rem', position: 'relative' }}>
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '16/9',
                  overflow: 'hidden',
                }}
              >
                <Image
                  src={article.featuredImage}
                  alt={article.title}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 720px"
                  style={{ objectFit: 'cover' }}
                />
              </div>
            </figure>
          )}

          {/* Article body — block renderer */}
          {article.body && article.body.length > 0 ? (
            <BlockRenderer blocks={article.body} />
          ) : article.content ? (
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '1.05rem',
                lineHeight: 1.85,
                color: '#1E4A60',
                textAlign: 'justify',
              }}
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          ) : null}

          {/* End marker for analytics */}
          <div ref={articleEndRef} aria-hidden="true" />

          {/* Tags */}
          {article.tags.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                flexWrap: 'wrap',
                marginTop: '2.5rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid rgba(24,59,78,0.08)',
              }}
            >
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    background: 'rgba(24,59,78,0.06)',
                    color: '#183B4E',
                    padding: '0.25rem 0.75rem',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-body)',
                    fontWeight: 600,
                    border: '1px solid rgba(24,59,78,0.12)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </article>

        {/* ── Related articles ──────────────────────────────────────────── */}
        {(relatedArticles.length > 0 || issue) && (
          <section
            dir="rtl"
            style={{
              background: '#183B4E',
              padding: '3rem 1.5rem',
            }}
          >
            <div style={{ maxWidth: '720px', margin: '0 auto' }}>
              {/* Back to issue link */}
              {issue && (
                <div style={{ marginBottom: '2rem' }}>
                  <Link
                    href={`/magazine/${issueId}`}
                    style={{
                      color: '#DDA853',
                      textDecoration: 'none',
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                    العودة إلى العدد
                  </Link>
                </div>
              )}

              {relatedArticles.length > 0 && (
                <>
                  <h2
                    style={{
                      fontFamily: 'var(--font-body)',
                      color: '#DDA853',
                      fontSize: '1rem',
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      margin: '0 0 1.5rem',
                    }}
                  >
                    اقرأ المزيد من هذا العدد
                  </h2>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                      gap: '1rem',
                    }}
                  >
                    {relatedArticles.map((rel) => (
                      <RelatedArticleCard
                        key={rel.id}
                        article={rel}
                        issueId={issueId}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
