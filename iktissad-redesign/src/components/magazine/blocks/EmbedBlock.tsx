'use client'

import type { EmbedBlock } from '@/types'

interface Props {
  block: EmbedBlock
}

/**
 * Extract YouTube video ID from various YouTube URL formats.
 * Converts to youtube-nocookie.com embed URL for privacy.
 */
function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url)
    let videoId: string | null = null

    if (u.hostname.includes('youtube.com')) {
      videoId = u.searchParams.get('v')
    } else if (u.hostname === 'youtu.be') {
      videoId = u.pathname.slice(1)
    }

    if (!videoId) return null
    return `https://www.youtube-nocookie.com/embed/${videoId}`
  } catch {
    return null
  }
}

/**
 * EmbedBlock — Embedded media (YouTube, Twitter, Instagram, generic iframe).
 *
 * YouTube: converts to youtube-nocookie.com, aspect-ratio 16/9, lazy load.
 * Twitter/Instagram: shows branded placeholder with link (oembed not wired yet).
 * Generic: sandbox iframe.
 *
 * aspectRatio field from block controls the container ratio (defaults 16/9).
 */
export function EmbedBlock({ block }: Props) {
  const aspectRatio = block.aspectRatio ?? '16/9'

  if (block.provider === 'youtube') {
    const embedUrl = getYouTubeEmbedUrl(block.src)
    if (!embedUrl) {
      return (
        <div
          dir="rtl"
          style={{
            marginBlockStart: '2em',
            marginBlockEnd: '2em',
            padding: '1rem',
            background: '#F5EEDC',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            color: '#183B4E',
          }}
        >
          <p style={{ margin: 0 }}>
            رابط YouTube غير صالح:{' '}
            <a href={block.src} target="_blank" rel="noopener noreferrer" style={{ color: '#DDA853' }}>
              {block.src}
            </a>
          </p>
        </div>
      )
    }

    return (
      <figure
        dir="rtl"
        style={{ marginBlockStart: '2em', marginBlockEnd: '2em', marginInline: 0 }}
        className="magazine-embed magazine-embed--youtube"
      >
        <div style={{ aspectRatio, width: '100%', overflow: 'hidden', borderRadius: '0.25rem' }}>
          <iframe
            src={embedUrl}
            title={block.caption ?? 'YouTube video'}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          />
        </div>
        {block.caption && (
          <figcaption
            style={{
              fontFamily: "var(--font-body, 'Tajawal', sans-serif)",
              fontSize: '0.8rem',
              color: '#555',
              marginBlockStart: '0.5rem',
              fontStyle: 'italic',
            }}
          >
            {block.caption}
          </figcaption>
        )}
      </figure>
    )
  }

  if (block.provider === 'twitter' || block.provider === 'instagram') {
    const label = block.provider === 'twitter' ? 'X (Twitter)' : 'Instagram'
    const bgColor = block.provider === 'twitter' ? '#1da1f2' : '#e4405f'

    return (
      <figure
        dir="rtl"
        style={{ marginBlockStart: '2em', marginBlockEnd: '2em', marginInline: 0 }}
        className={`magazine-embed magazine-embed--${block.provider}`}
      >
        <a
          href={block.src}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem 1.25rem',
            background: '#F5EEDC',
            border: `1px solid ${bgColor}30`,
            borderRadius: '0.5rem',
            textDecoration: 'none',
            color: '#183B4E',
            fontFamily: "var(--font-body, 'Tajawal', sans-serif)",
            fontSize: '0.9rem',
          }}
        >
          <span
            style={{
              width: '2rem',
              height: '2rem',
              background: bgColor,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 700,
              fontSize: '0.75rem',
              flexShrink: 0,
            }}
          >
            {block.provider === 'twitter' ? 'X' : 'IG'}
          </span>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {label}: {block.src}
          </span>
        </a>
        {block.caption && (
          <figcaption
            style={{
              fontFamily: "var(--font-body, 'Tajawal', sans-serif)",
              fontSize: '0.8rem',
              color: '#555',
              marginBlockStart: '0.5rem',
              fontStyle: 'italic',
            }}
          >
            {block.caption}
          </figcaption>
        )}
      </figure>
    )
  }

  // Generic / custom iframe
  return (
    <figure
      dir="rtl"
      style={{ marginBlockStart: '2em', marginBlockEnd: '2em', marginInline: 0 }}
      className="magazine-embed magazine-embed--generic"
    >
      <div style={{ aspectRatio, width: '100%', overflow: 'hidden', borderRadius: '0.25rem' }}>
        <iframe
          src={block.src}
          title={block.caption ?? 'Embedded content'}
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-presentation"
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        />
      </div>
      {block.caption && (
        <figcaption
          style={{
            fontFamily: "var(--font-body, 'Tajawal', sans-serif)",
            fontSize: '0.8rem',
            color: '#555',
            marginBlockStart: '0.5rem',
            fontStyle: 'italic',
          }}
        >
          {block.caption}
        </figcaption>
      )}
    </figure>
  )
}
