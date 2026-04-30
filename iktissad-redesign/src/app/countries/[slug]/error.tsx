'use client';

import { AlertTriangle, RefreshCw, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-loss/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-loss" />
        </div>
        <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-ink mb-3">
          تعذر تحميل بيانات الدولة
        </h1>
        <p className="text-graphite mb-8 font-[family-name:var(--font-display)]">
          يرجى المحاولة مرة أخرى أو العودة للصفحة الرئيسية
        </p>
        <div className="flex items-center justify-center gap-4">
          <button onClick={reset} className="btn-gold flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            <span>إعادة المحاولة</span>
          </button>
          <Link href="/countries" className="btn-outline flex items-center gap-2">
            <span>العودة للدول</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
