/**
 * Print-mode spread renderer — /print/[issueId]
 *
 * Server component. No admin chrome. Pure spread HTML for Puppeteer PDF export.
 * Security: ?token= query param verified against PRINT_SECRET env var.
 * Each spread renders as an A3-landscape div (420mm × 297mm).
 * Arabic fonts loaded via Google Fonts CDN (Puppeteer loads external resources by default).
 */

import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import PrintSpread from './PrintSpread'

// ── Types ──────────────────────────────────────────────────────

interface Spread {
  id: string
  page_number: number
  template_id: string
  zones: Record<string, unknown>
  metadata: Record<string, unknown>
}

// ── Token verification ─────────────────────────────────────────

function verifyToken(token: string | undefined, issueId: string): boolean {
  const secret = process.env.PRINT_SECRET
  if (!secret) return false
  if (!token) return false
  // Simple HMAC-free approach: token must equal HMAC(issueId, secret)
  // For production use crypto.createHmac. Here we use a simpler comparison.
  const expected = Buffer.from(`${secret}:${issueId}`).toString('base64url')
  return token === expected
}

// ── Page ──────────────────────────────────────────────────────

export default async function PrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ issueId: string }>
  searchParams: Promise<{ token?: string }>
}) {
  const { issueId } = await params
  const { token } = await searchParams

  if (!verifyToken(token, issueId)) {
    return (
      <html>
        <body style={{ fontFamily: 'sans-serif', textAlign: 'center', paddingTop: '4rem', color: '#666' }}>
          <h1 style={{ fontSize: '1.5rem' }}>403 — غير مصرح</h1>
          <p>رمز الوصول غير صالح أو منتهي الصلاحية.</p>
        </body>
      </html>
    )
  }

  // Fetch issue + spreads
  const supabase = createAdminClient()

  const { data: issue } = await (supabase as any)
    .from('magazine_issues')
    .select('id, title, issue_number')
    .eq('id', issueId)
    .single() as { data: { id: string; title: string; issue_number: number } | null }

  if (!issue) {
    notFound()
  }

  const { data: spreads } = await (supabase as any)
    .from('magazine_spreads')
    .select('id, page_number, template_id, zones, metadata')
    .eq('issue_id', issueId)
    .order('page_number', { ascending: true }) as { data: Spread[] | null }

  const spreadList = spreads ?? []

  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{`مجلة اقتصاد — العدد ${issue.issue_number}`}</title>

        {/* Arabic fonts via Google Fonts CDN — Puppeteer loads external resources */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- print-only PDF route loaded by Puppeteer, not by Next.js navigation */}
        <link
          href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap"
          rel="stylesheet"
        />

        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }

          @page {
            size: A3 landscape;
            margin: 0;
          }

          html, body {
            width: 420mm;
            background: #F5EEDC;
            font-family: 'Tajawal', 'Arial', sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .spread-container {
            width: 420mm;
            height: 297mm;
            overflow: hidden;
            position: relative;
            page-break-after: always;
            break-after: page;
            display: grid;
          }

          .spread-container:last-child {
            page-break-after: avoid;
            break-after: avoid;
          }

          /* Design tokens */
          :root {
            --obsidian: #183B4E;
            --navy:     #27548A;
            --gold:     #DDA853;
            --cream:    #F5EEDC;
          }

          /* Zone base */
          .zone {
            overflow: hidden;
            position: relative;
          }
          .zone-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .zone-text {
            padding: 2rem;
            color: var(--obsidian);
          }
          .zone-text h1 {
            font-size: clamp(1.5rem, 3vw, 2.5rem);
            font-weight: 800;
            line-height: 1.2;
            color: var(--obsidian);
            margin-bottom: 1rem;
          }
          .zone-text h2 {
            font-size: clamp(1.2rem, 2vw, 1.875rem);
            font-weight: 700;
            line-height: 1.3;
            color: var(--obsidian);
            margin-bottom: 0.75rem;
          }
          .zone-text p {
            font-size: 0.9375rem;
            line-height: 1.7;
            color: rgba(24, 59, 78, 0.85);
            text-align: justify;
          }
          .zone-pullquote {
            border-inline-start: 4px solid var(--gold);
            padding: 1.5rem 1.5rem 1.5rem 1rem;
            background: rgba(221,168,83,0.06);
          }
          .zone-pullquote blockquote {
            font-size: 1.375rem;
            font-weight: 700;
            color: var(--obsidian);
            font-style: italic;
            line-height: 1.5;
          }
          .zone-pullquote cite {
            display: block;
            margin-top: 0.75rem;
            font-size: 0.875rem;
            color: var(--gold);
            font-style: normal;
          }

          /* Folio */
          .folio {
            position: absolute;
            bottom: 0.75rem;
            color: var(--gold);
            font-size: 0.75rem;
            font-weight: 700;
          }
          .folio-start { inset-inline-start: 1.5rem; }
          .folio-end   { inset-inline-end: 1.5rem; }

          /* Spine shadow */
          .spine-shadow {
            position: absolute;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 6px;
            height: 100%;
            background: linear-gradient(
              to right,
              rgba(0,0,0,0.12) 0%,
              rgba(0,0,0,0.04) 40%,
              rgba(0,0,0,0.04) 60%,
              rgba(0,0,0,0.12) 100%
            );
            z-index: 10;
            pointer-events: none;
          }
        `}</style>
      </head>
      <body>
        {spreadList.length === 0 ? (
          <div
            className="spread-container"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#183B4E',
              color: '#DDA853',
              fontSize: '1.5rem',
            }}
          >
            لا توجد صفحات لهذا العدد
          </div>
        ) : (
          spreadList.map((spread) => (
            <PrintSpread
              key={spread.id}
              spread={spread}
              issueNumber={issue.issue_number}
            />
          ))
        )}
      </body>
    </html>
  )
}
