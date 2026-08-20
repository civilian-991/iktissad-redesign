import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'غير متصل بالإنترنت | الإقتصاد والأعمال',
};

export default function OfflinePage() {
  return (
    <main
      dir="rtl"
      className="min-h-screen bg-cream flex flex-col items-center justify-center gap-6 px-4 text-center font-[family-name:var(--font-display)]"
    >
      <div className="w-16 h-16 rounded-full bg-sand/40 flex items-center justify-center">
        {/* Wifi-off icon as inline SVG — no lucide import needed on this static page */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-charcoal/50"
        >
          <line x1="2" y1="2" x2="22" y2="22" />
          <path d="M8.5 16.5a5 5 0 0 1 7 0" />
          <path d="M2 8.82a15 15 0 0 1 4.17-2.65" />
          <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76" />
          <path d="M16.85 11.25a10 10 0 0 1 2.22 1.68" />
          <path d="M5 12.03A10 10 0 0 1 11.86 10" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-ink">أنت غير متصل بالإنترنت</h1>
        <p className="text-charcoal/60 text-sm max-w-xs">
          تحقق من اتصالك بالإنترنت ثم أعد المحاولة. المقالات التي قرأتها مؤخراً متاحة دون اتصال.
        </p>
      </div>

      <Link
        href="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold text-white text-sm font-medium rounded hover:bg-gold/90 transition-colors"
      >
        العودة للرئيسية
      </Link>
    </main>
  );
}
