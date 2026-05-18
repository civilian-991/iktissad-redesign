import { ImageResponse } from 'next/og'
import { createAdminClient } from '@/lib/supabase/admin'

// next/og works on both edge and nodejs. Nodejs avoids the Edge runtime's
// stricter font-fetch limits and gives us createAdminClient access without
// extra polyfills, so we pin to nodejs explicitly.
export const runtime = 'nodejs'
export const alt = 'مقال - الإقتصاد والأعمال'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const BRAND_NAVY = '#183B4E'
const BRAND_NAVY_DARK = '#0F2A38'
const BRAND_GOLD = '#DDA853'
const BRAND_CREAM = '#F5EEDC'
const BRAND_BLUE = '#27548A'

async function loadTajawal(): Promise<{
  regular: ArrayBuffer | null
  bold: ArrayBuffer | null
}> {
  // Two weights for hierarchy. Failure on either is non-fatal — system
  // fallback fonts take over in ImageResponse.
  const [regularRes, boldRes] = await Promise.allSettled([
    fetch(
      'https://fonts.gstatic.com/s/tajawal/v9/Iura6YBj_oCad4k1l5qjHrRpiYlJ.woff2',
    ).then((r) => r.arrayBuffer()),
    fetch(
      'https://fonts.gstatic.com/s/tajawal/v9/Iurf6YBj_oCad4k1l_6gLrZjiLlJ-G0.woff2',
    ).then((r) => r.arrayBuffer()),
  ])
  return {
    regular: regularRes.status === 'fulfilled' ? regularRes.value : null,
    bold: boldRes.status === 'fulfilled' ? boldRes.value : null,
  }
}

function truncate(str: string, max: number): string {
  if (!str) return ''
  return str.length > max ? str.slice(0, max - 1).trimEnd() + '…' : str
}

function FallbackBrand({
  fontFamily,
}: {
  fontFamily: string
}) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        direction: 'rtl',
        fontFamily,
        background: `linear-gradient(135deg, ${BRAND_NAVY} 0%, ${BRAND_BLUE} 50%, ${BRAND_NAVY} 100%)`,
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 6,
          background: BRAND_GOLD,
        }}
      />
      <div
        style={{
          color: BRAND_GOLD,
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: '0.2em',
          marginBottom: 24,
        }}
      >
        IKTISSAD
      </div>
      <div
        style={{
          color: BRAND_CREAM,
          fontSize: 88,
          fontWeight: 900,
          lineHeight: 1,
          letterSpacing: '-0.02em',
        }}
      >
        الإقتصاد والأعمال
      </div>
      <div
        style={{
          color: 'rgba(245,238,220,0.65)',
          fontSize: 24,
          marginTop: 20,
        }}
      >
        تحليلات اقتصادية ومالية
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: 'rgba(221,168,83,0.4)',
        }}
      />
    </div>
  )
}

export default async function OGImage({
  params,
}: {
  params: { slug: string }
}) {
  const { regular, bold } = await loadTajawal()
  const fontFamily = regular || bold ? 'Tajawal' : 'sans-serif'

  const fonts = [
    ...(regular
      ? [
          {
            name: 'Tajawal',
            data: regular,
            style: 'normal' as const,
            weight: 400 as const,
          },
        ]
      : []),
    ...(bold
      ? [
          {
            name: 'Tajawal',
            data: bold,
            style: 'normal' as const,
            weight: 700 as const,
          },
        ]
      : []),
  ]

  // Fetch the article via the admin client (server-side, no auth needed).
  // Restrict to published rows so unpublished drafts never leak via OG crawl.
  let article: {
    title: string
    featured_image: string | null
    sections: { name: string | null } | null
    users: { name: string | null } | null
  } | null = null

  try {
    const admin = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (admin as any)
      .from('articles')
      .select(
        'title, featured_image, status, sections:section_id ( name ), users:author_id ( name )',
      )
      .eq('slug', params.slug)
      .eq('status', 'published')
      .single()
    if (data) {
      article = {
        title: typeof data.title === 'string' ? data.title : '',
        featured_image:
          typeof data.featured_image === 'string' ? data.featured_image : null,
        sections: data.sections ?? null,
        users: data.users ?? null,
      }
    }
  } catch {
    // Fall through to the fallback image.
  }

  if (!article) {
    return new ImageResponse(<FallbackBrand fontFamily={fontFamily} />, {
      ...size,
      fonts,
    })
  }

  // Strip HTML tags (titles can carry markup from the Drupal migration).
  const rawTitle = article.title.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  const title = truncate(rawTitle, 140) || 'مقال'
  const sectionName = article.sections?.name?.trim() || ''
  const authorName = article.users?.name?.trim() || ''
  const featuredImage = article.featured_image || ''

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          direction: 'rtl',
          fontFamily,
          background: BRAND_NAVY,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Featured image as full-bleed background */}
        {featuredImage && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
            }}
          >
            { }
            <img
              src={featuredImage}
              alt=""
              width={1200}
              height={630}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </div>
        )}

        {/* Darkening + bottom-heavy gradient overlay for legibility */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: featuredImage
              ? `linear-gradient(180deg, rgba(15,42,56,0.55) 0%, rgba(15,42,56,0.75) 45%, ${BRAND_NAVY_DARK} 100%)`
              : `linear-gradient(135deg, ${BRAND_NAVY} 0%, ${BRAND_BLUE} 50%, ${BRAND_NAVY} 100%)`,
          }}
        />

        {/* Top gold accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: BRAND_GOLD,
          }}
        />

        {/* Bottom gold accent bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 3,
            background: 'rgba(221,168,83,0.5)',
          }}
        />

        {/* Foreground content */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            padding: '64px 72px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'stretch',
          }}
        >
          {/* Top row: brand mark + section badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                color: BRAND_CREAM,
              }}
            >
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                }}
              >
                الإقتصاد والأعمال
              </div>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  background: BRAND_GOLD,
                }}
              />
              <div
                style={{
                  fontSize: 16,
                  letterSpacing: '0.18em',
                  color: BRAND_GOLD,
                  fontWeight: 700,
                }}
              >
                IKTISSAD
              </div>
            </div>

            {sectionName && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 22px',
                  background: BRAND_GOLD,
                  color: BRAND_NAVY_DARK,
                  fontSize: 20,
                  fontWeight: 700,
                  borderRadius: 999,
                  letterSpacing: '0.02em',
                }}
              >
                {truncate(sectionName, 36)}
              </div>
            )}
          </div>

          {/* Title block */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              width: '100%',
            }}
          >
            <div
              style={{
                width: 64,
                height: 4,
                background: BRAND_GOLD,
                marginBottom: 28,
                borderRadius: 2,
              }}
            />
            <div
              style={{
                color: BRAND_CREAM,
                fontSize: title.length > 80 ? 52 : 64,
                fontWeight: 700,
                lineHeight: 1.25,
                textAlign: 'right',
                width: '100%',
                letterSpacing: '-0.01em',
                textShadow: '0 2px 12px rgba(0,0,0,0.45)',
              }}
            >
              {title}
            </div>
          </div>

          {/* Bottom row: author + CTA */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                color: 'rgba(245,238,220,0.85)',
                fontSize: 22,
                fontWeight: 400,
              }}
            >
              {authorName ? (
                <>
                  <span style={{ color: 'rgba(245,238,220,0.6)' }}>بقلم&nbsp;</span>
                  <span style={{ color: BRAND_CREAM, fontWeight: 700 }}>
                    {truncate(authorName, 48)}
                  </span>
                </>
              ) : (
                <span>iktissadonline.com</span>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 24px',
                background: 'rgba(221,168,83,0.18)',
                border: `1px solid ${BRAND_GOLD}`,
                color: BRAND_GOLD,
                fontSize: 18,
                fontWeight: 700,
                borderRadius: 6,
                letterSpacing: '0.02em',
              }}
            >
              اقرأ المقال ◀
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts,
    },
  )
}
