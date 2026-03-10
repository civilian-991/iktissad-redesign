import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'
export const alt = 'Iktissad Magazine Article'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage({
  params,
}: {
  params: { issueId: string; articleId: string }
}) {
  const supabase = await createClient()

  // Fetch article
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: article } = await (supabase as any)
    .from('articles')
    .select('title, excerpt, featured_image')
    .eq('id', params.articleId)
    .single()

  // Fetch issue
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: issue } = await (supabase as any)
    .from('magazine_issues')
    .select('title, issue_number, cover_image')
    .eq('id', params.issueId)
    .single()

  // Fetch Tajawal font for Arabic text rendering
  let tajawalFont: ArrayBuffer | null = null
  try {
    const fontRes = await fetch(
      'https://fonts.gstatic.com/s/tajawal/v9/Iura6YBj_oCad4k1l5qjHrRpiYlJ.woff2',
    )
    tajawalFont = await fontRes.arrayBuffer()
  } catch {
    // Font fetch failed — ImageResponse will fall back to system fonts
  }

  const articleTitle = (article?.title as string) ?? 'مقال'
  const articleExcerpt = (article?.excerpt as string) ?? ''
  const articleImage = (article?.featured_image as string) ?? ''
  const issueNumber = (issue?.issue_number as string | number) ?? ''

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          direction: 'rtl',
          fontFamily: tajawalFont ? 'Tajawal' : 'sans-serif',
          background: '#183B4E',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background article image (blurred overlay) */}
        {articleImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={articleImage}
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.2,
            }}
          />
        )}

        {/* Dark gradient overlay for readability */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to top, rgba(24,59,78,0.95) 0%, rgba(24,59,78,0.6) 50%, rgba(24,59,78,0.4) 100%)',
          }}
        />

        {/* Gold accent bar — top */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: '#DDA853',
          }}
        />

        {/* Logo — top right (RTL: inline-start) */}
        <div
          style={{
            position: 'absolute',
            top: 40,
            right: 60,
            color: '#F5EEDC',
            fontSize: 28,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 4,
              height: 28,
              background: '#DDA853',
              borderRadius: 2,
            }}
          />
          إقتصاد
        </div>

        {/* Content — bottom aligned */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '60px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
          }}
        >
          {/* Issue label */}
          {issueNumber && (
            <div
              style={{
                color: '#DDA853',
                fontSize: 18,
                marginBottom: 16,
                fontWeight: 600,
                letterSpacing: '0.05em',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 2,
                  background: '#DDA853',
                  borderRadius: 1,
                }}
              />
              إقتصاد — العدد {issueNumber}
            </div>
          )}

          {/* Article title */}
          <div
            style={{
              color: '#F5EEDC',
              fontSize: articleTitle.length > 60 ? 40 : 52,
              fontWeight: 800,
              lineHeight: 1.3,
              marginBottom: 20,
              textAlign: 'right',
              maxWidth: '900px',
            }}
          >
            {articleTitle}
          </div>

          {/* Excerpt */}
          {articleExcerpt && (
            <div
              style={{
                color: 'rgba(245,238,220,0.7)',
                fontSize: 22,
                lineHeight: 1.5,
                maxWidth: '80%',
                textAlign: 'right',
              }}
            >
              {articleExcerpt.length > 120
                ? `${articleExcerpt.slice(0, 120)}...`
                : articleExcerpt}
            </div>
          )}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: tajawalFont
        ? [{ name: 'Tajawal', data: tajawalFont, style: 'normal', weight: 700 }]
        : [],
    },
  )
}
