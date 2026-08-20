/**
 * Magazine Reader Not Found
 * IKTISSAD Design System
 *
 * Shown when a requested magazine issue does not exist.
 */

import Link from 'next/link';
import { BookOpen } from 'lucide-react';

export default function ReaderNotFound() {
  return (
    <div
      dir="rtl"
      className="min-h-screen bg-obsidian flex flex-col items-center justify-center gap-6 p-8 text-center"
    >
      <div className="w-20 h-20 rounded-2xl bg-gold/10 flex items-center justify-center">
        <BookOpen size={40} className="text-gold" />
      </div>

      <div>
        <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-2">
          هذا العدد غير موجود
        </h1>
        <p className="text-white/50 font-[family-name:var(--font-display)] max-w-sm mx-auto">
          لم يتم العثور على العدد المطلوب. ربما تم حذفه أو أن الرابط غير صحيح.
        </p>
      </div>

      <Link
        href="/magazine"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gold text-ink font-[family-name:var(--font-display)] font-bold text-sm transition-all hover:bg-gold/90"
      >
        العودة إلى الأعداد
      </Link>
    </div>
  );
}
