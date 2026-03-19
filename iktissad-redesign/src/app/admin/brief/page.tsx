'use client';

/**
 * Admin Brief Page
 * /admin/brief
 *
 * Phase 9.1 — AI Article Brief Generator page.
 * Renders the ArticleBriefGenerator component with a page header.
 */

import { Lightbulb } from 'lucide-react';
import { iconSizes } from '@/lib/design-tokens';
import ArticleBriefGenerator from '@/components/admin/ArticleBriefGenerator';

export default function BriefPage() {
  return (
    <div className="space-y-6" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
              <Lightbulb size={iconSizes.md} className="text-gold" />
            </div>
            <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white">
              موجز المقال
            </h1>
          </div>
          <p className="text-white/40 text-sm font-[family-name:var(--font-display)] mr-12">
            توليد موجز تحريري شامل بالذكاء الاصطناعي من فكرة أو موضوع
          </p>
        </div>

        {/* Phase badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gold/5 border border-gold/15 self-start md:self-auto">
          <Lightbulb size={12} className="text-gold/70" />
          <span className="text-xs text-gold/70 font-[family-name:var(--font-display)]">
            المرحلة 9.1 — ذكاء المحتوى
          </span>
        </div>
      </div>

      {/* Generator */}
      <ArticleBriefGenerator />
    </div>
  );
}
