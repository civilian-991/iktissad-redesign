'use client';

import { useRef, useState, useEffect } from 'react';
import type { MagazineSpread, Article, ArticleBlock } from '@/types';

// Lazy import BlockRenderer — gracefully handle if Agent 4B hasn't created it yet
let BlockRendererModule: { BlockRenderer: React.ComponentType<{ blocks: ArticleBlock[] }> } | null = null;

interface ArticleSpreadProps {
  article?: Partial<Article> | null;
  spread: MagazineSpread;
}

// ── Fallback plain text renderer (if BlockRenderer not yet available) ─────────

function PlainBodyRenderer({ blocks, content }: { blocks?: ArticleBlock[]; content?: string }) {
  if (blocks && blocks.length > 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {blocks.map((block, i) => {
          if (block._type === 'paragraph') {
            return (
              <p
                key={i}
                style={{
                  color: '#2a2a2a',
                  fontSize: '14px',
                  fontFamily: 'var(--font-arabic)',
                  lineHeight: '1.9',
                  textAlign: 'justify',
                  margin: 0,
                  // Enable kashida on Chrome/Edge
                  textJustify: 'auto',
                  wordBreak: 'keep-all',
                  hyphens: 'none',
                }}
                dangerouslySetInnerHTML={{ __html: block.html }}
              />
            );
          }
          if (block._type === 'heading') {
            const Tag = `h${block.level}` as 'h2' | 'h3' | 'h4';
            return (
              <Tag
                key={i}
                style={{
                  color: '#183B4E',
                  fontFamily: 'var(--font-arabic)',
                  fontWeight: '700',
                  lineHeight: '1.4',
                  margin: '8px 0 4px',
                  fontSize: block.level === 2 ? '18px' : block.level === 3 ? '16px' : '14px',
                }}
              >
                {block.text}
              </Tag>
            );
          }
          if (block._type === 'pullQuote') {
            return (
              <blockquote
                key={i}
                style={{
                  borderInlineStart: '3px solid #DDA853',
                  paddingInlineStart: '16px',
                  margin: '8px 0',
                }}
              >
                <p
                  style={{
                    color: '#183B4E',
                    fontSize: '15px',
                    fontFamily: 'var(--font-arabic)',
                    fontStyle: 'italic',
                    fontWeight: '600',
                    lineHeight: '1.6',
                    margin: '0 0 4px',
                  }}
                >
                  «{block.text}»
                </p>
                {block.attribution && (
                  <cite
                    style={{
                      color: '#DDA853',
                      fontSize: '11px',
                      fontFamily: 'var(--font-arabic)',
                      fontStyle: 'normal',
                      fontWeight: '700',
                    }}
                  >
                    — {block.attribution}
                  </cite>
                )}
              </blockquote>
            );
          }
          // Other block types: skip in fallback
          return null;
        })}
      </div>
    );
  }

  if (content) {
    return (
      <div
        style={{
          color: '#2a2a2a',
          fontSize: '14px',
          fontFamily: 'var(--font-arabic)',
          lineHeight: '1.9',
          textAlign: 'justify',
          wordBreak: 'keep-all',
          hyphens: 'none',
        }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  return (
    <p
      style={{
        color: 'rgba(24,59,78,0.3)',
        fontFamily: 'var(--font-arabic)',
        textAlign: 'center',
        marginTop: '40px',
      }}
    >
      لا يوجد محتوى
    </p>
  );
}

// ── Main ArticleSpread component ─────────────────────────────────────────────

export default function ArticleSpread({ article, spread }: ArticleSpreadProps) {
  const [BlockRenderer, setBlockRenderer] = useState<React.ComponentType<{ blocks: ArticleBlock[] }> | null>(null);

  // Try to dynamically import BlockRenderer (Agent 4B creates this)
  useEffect(() => {
    import('@/components/magazine/BlockRenderer')
      .then(mod => setBlockRenderer(() => mod.BlockRenderer))
      .catch(() => {
        // BlockRenderer not yet available — use fallback
      });
  }, []);

  // Metadata from spread zones
  const zones = spread.zones as {
    article?: Partial<Article>;
    sectionName?: string;
    issueLabel?: string;
    pageNumber?: number;
  };

  // Prefer explicitly-passed article, then zones.article
  const articleData = article ?? zones.article;
  const sectionName = zones.sectionName ?? articleData?.section ?? '';
  const issueLabel = zones.issueLabel ?? '';
  const pageNumber = zones.pageNumber ?? spread.pageNumber;

  const body = articleData?.body;
  const content = articleData?.content;

  return (
    <div
      dir="rtl"
      style={{
        width: '100%',
        height: '100%',
        background: '#F5EEDC',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* ── Running head — sticky top bar ─────────────────────────────── */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 32px',
          background: 'rgba(245,238,220,0.95)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(24,59,78,0.08)',
        }}
      >
        <span
          style={{
            color: '#DDA853',
            fontSize: '11px',
            fontFamily: 'var(--font-arabic)',
            fontWeight: '700',
            letterSpacing: '0.06em',
          }}
        >
          {sectionName}
        </span>
        <span
          style={{
            color: 'rgba(24,59,78,0.4)',
            fontSize: '11px',
            fontFamily: 'var(--font-arabic)',
          }}
        >
          {issueLabel}
        </span>
      </div>

      {/* ── Article body ──────────────────────────────────────────────── */}
      <div
        style={{
          flex: '1 1 auto',
          overflow: 'auto',
          padding: '32px 40px 60px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0',
        }}
      >
        {/* Article headline */}
        {articleData?.title && (
          <h1
            style={{
              color: '#183B4E',
              fontSize: 'clamp(1.4rem, 2.8vw, 2.2rem)',
              fontFamily: 'var(--font-arabic)',
              fontWeight: '900',
              lineHeight: '1.35',
              margin: '0 0 16px',
            }}
          >
            {articleData.title}
          </h1>
        )}

        {/* Deck / excerpt */}
        {articleData?.deck && (
          <p
            style={{
              color: '#27548A',
              fontSize: '15px',
              fontFamily: 'var(--font-arabic)',
              fontWeight: '500',
              lineHeight: '1.7',
              margin: '0 0 24px',
            }}
          >
            {articleData.deck}
          </p>
        )}

        {/* Author row */}
        {articleData?.author && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '28px',
              paddingBottom: '20px',
              borderBottom: '1px solid rgba(24,59,78,0.1)',
            }}
          >
            {articleData.author.avatar && (
              <img
                src={articleData.author.avatar}
                alt={articleData.author.name}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  flexShrink: 0,
                }}
              />
            )}
            <div>
              <p
                style={{
                  color: '#183B4E',
                  fontSize: '13px',
                  fontFamily: 'var(--font-arabic)',
                  fontWeight: '700',
                  margin: '0 0 2px',
                }}
              >
                {articleData.author.name}
              </p>
              {articleData.publishedAt && (
                <p
                  style={{
                    color: 'rgba(24,59,78,0.5)',
                    fontSize: '11px',
                    fontFamily: 'var(--font-arabic)',
                    margin: 0,
                  }}
                >
                  {new Date(articleData.publishedAt).toLocaleDateString('ar-SA', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Body content — prefer BlockRenderer if available, fall back to plain */}
        {BlockRenderer && body && body.length > 0 ? (
          <BlockRenderer blocks={body} />
        ) : (
          <PlainBodyRenderer blocks={body} content={content} />
        )}
      </div>

      {/* ── Folio — page number at bottom-outside corner (inline-end) ─── */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          insetInlineEnd: '24px',
          color: '#DDA853',
          fontSize: '12px',
          fontFamily: 'var(--font-arabic)',
          fontWeight: '700',
          fontVariantNumeric: 'tabular-nums',
        }}
        aria-label={`صفحة ${pageNumber}`}
      >
        {pageNumber}
      </div>
    </div>
  );
}
