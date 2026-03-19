/**
 * Admin Headline A/B Lab Page
 * /admin/headlines
 *
 * Standalone page for the Headline A/B Lab.
 * Renders the HeadlineABLab component which handles all state internally.
 */

'use client'

import { FlaskConical } from 'lucide-react'
import { iconSizes } from '@/lib/design-tokens'
import HeadlineABLab from '@/components/admin/HeadlineABLab'
import SectionErrorBoundary from '@/components/admin/SectionErrorBoundary'

export default function HeadlinesPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
              <FlaskConical size={iconSizes.md} className="text-gold" />
            </div>
            <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white">
              مختبر A/B للعناوين
            </h1>
          </div>
          <p className="text-white/40 text-sm font-[family-name:var(--font-display)] mr-12">
            توليد متغيرات ذكية للعناوين واختبار أدائها
          </p>
        </div>
      </div>

      {/* Lab */}
      <SectionErrorBoundary section="headline-ab-lab">
        <HeadlineABLab />
      </SectionErrorBoundary>
    </div>
  )
}
