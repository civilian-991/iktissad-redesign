/**
 * GET /api/gcc/og — deterministic branded card image for a GCC news article.
 *
 * Rendered on-the-fly by Vercel (next/og), so there's no AI-image hallucination
 * risk and no storage needed — the URL itself IS the image. Used as the
 * article's featured_image/og_image and shown on the Telegram review card.
 *
 *   /api/gcc/og?title=...&badge=...&issuer=...
 */

import { ImageResponse } from 'next/og';

export const runtime = 'edge';

const BADGE_COLORS: Record<string, string> = {
  halt: '#dc2626', legal: '#dc2626', regulatory: '#dc2626',
  board: '#7c3aed', leadership: '#7c3aed',
  earnings: '#16a34a', dividend: '#16a34a',
  ownership: '#2563eb', deal: '#2563eb', capital_change: '#2563eb', capital: '#2563eb',
  ipo_listing: '#0891b2', debt_fund: '#0891b2',
};

const BADGE_LABEL: Record<string, string> = {
  halt: '⚡ تعليق تداول', legal: '⚖️ قضية', regulatory: '⚖️ تنظيمي',
  board: '🏛️ مجلس الإدارة', leadership: '🏛️ تغيير قيادي',
  earnings: '📊 نتائج مالية', dividend: '💰 توزيعات',
  ownership: '🤝 استحواذ', deal: '🤝 صفقة', capital_change: '🏦 رأس المال', capital: '🏦 رأس المال',
  ipo_listing: '📈 إدراج', debt_fund: '🏦 تمويل', other: '📰 خبر',
};

async function loadFont(): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(
      'https://raw.githubusercontent.com/google/fonts/main/ofl/tajawal/Tajawal-Bold.ttf'
    );
    if (res.ok) return await res.arrayBuffer();
  } catch {
    /* fall back to default font */
  }
  return null;
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const title = (searchParams.get('title') || 'خبر اقتصادي').slice(0, 160);
  const badge = searchParams.get('badge') || 'other';
  const issuer = (searchParams.get('issuer') || '').slice(0, 60);

  const accent = BADGE_COLORS[badge] || '#2563eb';
  const label = BADGE_LABEL[badge] || BADGE_LABEL.other;
  const font = await loadFont();

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px',
          background: 'linear-gradient(135deg, #0a0e1a 0%, #14213d 100%)',
          fontFamily: 'Tajawal',
          direction: 'rtl',
        }}
      >
        {/* top row: brand + category badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', color: '#e2e8f0', fontSize: 34, fontWeight: 700 }}>
            اقتصاد · الأسواق الخليجية
          </div>
          <div
            style={{
              display: 'flex',
              background: accent,
              color: 'white',
              padding: '12px 28px',
              borderRadius: '999px',
              fontSize: 30,
            }}
          >
            {label}
          </div>
        </div>

        {/* headline */}
        <div
          style={{
            display: 'flex',
            color: 'white',
            fontSize: 60,
            fontWeight: 700,
            lineHeight: 1.3,
            maxHeight: '380px',
            overflow: 'hidden',
          }}
        >
          {title}
        </div>

        {/* bottom: issuer + accent bar */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', width: '120px', height: '8px', background: accent, marginBottom: '20px' }} />
          <div style={{ display: 'flex', color: '#94a3b8', fontSize: 30 }}>
            {issuer || 'تداول السعودية'}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: font ? [{ name: 'Tajawal', data: font, weight: 700, style: 'normal' }] : undefined,
    }
  );
}
