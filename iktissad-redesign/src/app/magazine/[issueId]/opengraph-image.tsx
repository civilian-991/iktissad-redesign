import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'
export const alt = 'Iktissad Magazine Issue'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage({
  params,
}: {
  params: { issueId: string }
}) {
  const supabase = await createClient()

  // Fetch issue data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: issue } = await (supabase as any)
    .from('magazine_issues')
    .select('title, subtitle, issue_number, cover_image, publish_date')
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

  const issueTitle = (issue?.title as string) ?? 'الإقتصاد والأعمال'
  const issueSubtitle = (issue?.subtitle as string) ?? ''
  const issueNumber = (issue?.issue_number as string | number) ?? ''
  const coverImage = (issue?.cover_image as string) ?? ''

  // Format publish date in Arabic
  let publishDateStr = ''
  if (issue?.publish_date) {
    try {
      publishDateStr = new Date(issue.publish_date as string).toLocaleDateString('ar-SA-u-ca-gregory', {
        year: 'numeric',
        month: 'long',
      })
    } catch {
      publishDateStr = ''
    }
  }

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
        {/* Cover image — full bleed left side (LTR layout for OG: cover on left) */}
        {coverImage && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '45%',
              bottom: 0,
              display: 'flex',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverImage}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
            {/* Fade edge into navy */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(to right, transparent 70%, #183B4E 100%)',
              }}
            />
          </div>
        )}

        {/* Fallback: full background gradient when no cover */}
        {!coverImage && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(135deg, #183B4E 0%, #27548A 50%, #183B4E 100%)',
              opacity: 0.6,
            }}
          />
        )}

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

        {/* Gold accent bar — bottom */}
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

        {/* Right-side content panel */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: coverImage ? '58%' : '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '60px',
            alignItems: 'flex-end',
          }}
        >
          {/* Tagline — top */}
          <div
            style={{
              color: '#DDA853',
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: '0.15em',
              marginBottom: 24,
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            مجلة الإقتصاد والأعمال
            <div
              style={{
                width: 32,
                height: 2,
                background: '#DDA853',
                borderRadius: 1,
              }}
            />
          </div>

          {/* Magazine nameplate */}
          <div
            style={{
              color: '#F5EEDC',
              fontSize: 72,
              fontWeight: 900,
              lineHeight: 1,
              marginBottom: 8,
              textAlign: 'right',
              letterSpacing: '-0.02em',
            }}
          >
            إقتصاد
          </div>

          {/* Issue number */}
          {issueNumber && (
            <div
              style={{
                color: 'rgba(245,238,220,0.5)',
                fontSize: 20,
                fontWeight: 400,
                marginBottom: 24,
                textAlign: 'right',
              }}
            >
              العدد {issueNumber}
              {publishDateStr ? ` — ${publishDateStr}` : ''}
            </div>
          )}

          {/* Issue title */}
          <div
            style={{
              color: '#F5EEDC',
              fontSize: 32,
              fontWeight: 700,
              lineHeight: 1.4,
              marginBottom: issueSubtitle ? 12 : 32,
              textAlign: 'right',
              maxWidth: '500px',
            }}
          >
            {issueTitle}
          </div>

          {/* Subtitle */}
          {issueSubtitle && (
            <div
              style={{
                color: 'rgba(245,238,220,0.65)',
                fontSize: 20,
                lineHeight: 1.5,
                marginBottom: 32,
                textAlign: 'right',
                maxWidth: '480px',
              }}
            >
              {issueSubtitle}
            </div>
          )}

          {/* CTA pill */}
          <div
            style={{
              background: '#DDA853',
              color: '#183B4E',
              padding: '12px 28px',
              fontSize: 18,
              fontWeight: 700,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            اكتشف العدد الجديد ◀
          </div>
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
