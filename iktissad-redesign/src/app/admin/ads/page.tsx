/**
 * Admin Ads Page — Coming Soon
 * IKTISSAD Design System
 */

'use client';

import { Megaphone } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export default function AdsPage() {
  const { t } = useTranslation();

  return (
    <div dir="rtl" className="max-w-4xl mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white">
          {t('admin.common.ads')}
        </h1>
        <p className="text-white/50 mt-1 text-sm font-[family-name:var(--font-display)]">
          إدارة الحملات الإعلانية والإعلانات
        </p>
      </div>

      {/* Coming soon placeholder */}
      <div className="bg-midnight/50 border border-gold/10 rounded-2xl flex flex-col items-center justify-center py-24 gap-6">
        <div className="w-20 h-20 rounded-2xl bg-gold/10 flex items-center justify-center">
          <Megaphone size={40} className="text-gold" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-[family-name:var(--font-display)] font-bold text-white mb-2">
            قريباً
          </h2>
          <p className="text-white/50 font-[family-name:var(--font-display)] max-w-sm">
            صفحة إدارة الإعلانات والحملات الإعلانية قيد التطوير وستكون متاحة قريباً.
          </p>
        </div>
      </div>
    </div>
  );
}
