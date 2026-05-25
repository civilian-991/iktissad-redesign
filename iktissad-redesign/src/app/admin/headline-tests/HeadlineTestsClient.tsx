'use client';

/**
 * Headline A/B Testing Dashboard — Client Component
 * Lists all tests with CTR, winner status, and controls.
 */

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import {
  FlaskConical,
  Trophy,
  Pause,
  Play,
  CheckCircle2,
  Loader2,
  Eye,
  MousePointer,
  TrendingUp,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { swrFetcher, headlineTestsKey, updateHeadlineTest } from '@/lib/api-client';
import { iconSizes } from '@/lib/design-tokens';
import type { ApiResponse } from '@/types';
import type { HeadlineTest } from '@/app/api/admin/headline-tests/route';
import WidgetErrorBoundary from '@/components/admin/WidgetErrorBoundary';

// ─── Status Filter ──────────────────────────────────────────────
type StatusFilter = 'all' | 'running' | 'completed' | 'paused';

// ─── CTR Helper ─────────────────────────────────────────────────
function calcCtr(impressions: number, clicks: number): string {
  if (impressions === 0) return '0.0%';
  return ((clicks / impressions) * 100).toFixed(1) + '%';
}

// ─── CTR Bar ────────────────────────────────────────────────────
function CtrBar({ ctr, maxCtr }: { ctr: number; maxCtr: number }) {
  const pct = maxCtr > 0 ? Math.round((ctr / maxCtr) * 100) : 0;
  const color =
    pct >= 80
      ? 'from-profit to-emerald-600'
      : pct >= 50
        ? 'from-amber-500 to-amber-400'
        : 'from-loss to-red-500';

  return (
    <div className="h-2 bg-white/5 rounded-full overflow-hidden w-24">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(pct, 4)}%` }}
        transition={{ duration: 0.5 }}
        className={`h-full rounded-full bg-gradient-to-r ${color}`}
      />
    </div>
  );
}

export default function HeadlineTestsClient() {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filterParam = statusFilter === 'all' ? {} : { status: statusFilter };
  const { data, isLoading, error, mutate } = useSWR<ApiResponse<HeadlineTest[]>>(
    headlineTestsKey(filterParam),
    swrFetcher,
    { revalidateOnFocus: false }
  );

  const tests = data?.data ?? [];

  const handleStatusChange = async (testId: string, newStatus: 'running' | 'paused' | 'completed') => {
    try {
      await updateHeadlineTest(testId, { status: newStatus });
      toast.success(newStatus === 'completed' ? 'تم إنهاء الاختبار' : 'تم تحديث الحالة');
      mutate();
    } catch {
      toast.error('فشل تحديث الاختبار');
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle size={48} className="text-loss" />
        <p className="text-white/60 font-[family-name:var(--font-display)]">
          Failed to load headline tests
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
              <FlaskConical size={iconSizes.md} className="text-gold" />
            </div>
            <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white">
              {t('admin.headlineTests.title')}
            </h1>
          </div>
          <p className="text-white/40 text-sm font-[family-name:var(--font-display)] ms-12">
            {t('admin.headlineTests.subtitle')}
          </p>
        </div>
        <Link
          href="/admin/headlines"
          className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg hover:bg-gold/90 transition-colors font-[family-name:var(--font-display)] text-sm font-semibold"
        >
          <Plus size={iconSizes.sm} />
          {t('admin.headlineTests.newTest')}
        </Link>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'running', 'completed', 'paused'] as StatusFilter[]).map((s) => {
          const labels: Record<StatusFilter, string> = {
            all: 'الكل',
            running: t('admin.headlineTests.running'),
            completed: t('admin.headlineTests.completed'),
            paused: t('admin.headlineTests.paused'),
          };
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-[family-name:var(--font-display)] transition-colors ${
                statusFilter === s
                  ? 'bg-gold/20 text-gold border border-gold/30'
                  : 'bg-white/5 text-white/50 border border-white/10 hover:text-white'
              }`}
            >
              {labels[s]}
            </button>
          );
        })}
      </div>

      {/* Tests List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-gold/50" />
        </div>
      ) : tests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 bg-midnight/50 border border-gold/10 rounded-xl">
          <FlaskConical size={40} className="text-white/20" />
          <p className="text-white/40 font-[family-name:var(--font-display)]">
            {t('admin.headlineTests.noTests')}
          </p>
          <Link
            href="/admin/headlines"
            className="px-4 py-2 bg-gold/10 text-gold rounded-lg hover:bg-gold/20 transition-colors text-sm font-[family-name:var(--font-display)]"
          >
            {t('admin.headlineTests.createTest')}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {tests.map((test, idx) => {
            // Compute max CTR for bar scaling
            const ctrs = test.variants.map((v) =>
              v.impressions > 0 ? v.clicks / v.impressions : 0
            );
            const maxCtr = Math.max(...ctrs, 0.001);

            return (
              <WidgetErrorBoundary key={test.id} label={`test-${test.id}`}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-5"
                >
                  {/* Test Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <Link
                        href={`/admin/articles/${test.articleId}`}
                        className="text-white hover:text-gold transition-colors font-[family-name:var(--font-display)] text-sm line-clamp-1"
                      >
                        {test.articleTitle}
                      </Link>
                      <div className="flex items-center gap-3 mt-1">
                        <StatusBadge status={test.status} />
                        {test.winnerIndex !== null && (
                          <span className="flex items-center gap-1 text-xs text-profit font-[family-name:var(--font-display)]">
                            <Trophy size={12} />
                            {t('admin.headlineTests.winner')}: {t('admin.headlineTests.variant')} {(test.winnerIndex + 1).toLocaleString('ar-u-nu-latn')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2">
                      {test.status === 'running' && (
                        <>
                          <button
                            onClick={() => handleStatusChange(test.id, 'paused')}
                            className="p-1.5 text-white/40 hover:text-amber-400 transition-colors"
                            title={t('admin.headlineTests.pauseTest')}
                          >
                            <Pause size={iconSizes.sm} />
                          </button>
                          <button
                            onClick={() => handleStatusChange(test.id, 'completed')}
                            className="p-1.5 text-white/40 hover:text-profit transition-colors"
                            title={t('admin.headlineTests.completeTest')}
                          >
                            <CheckCircle2 size={iconSizes.sm} />
                          </button>
                        </>
                      )}
                      {test.status === 'paused' && (
                        <button
                          onClick={() => handleStatusChange(test.id, 'running')}
                          className="p-1.5 text-white/40 hover:text-profit transition-colors"
                          title={t('admin.headlineTests.resumeTest')}
                        >
                          <Play size={iconSizes.sm} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Variants Table */}
                  <div className="space-y-2">
                    {test.variants.map((variant, vi) => {
                      const ctr = variant.impressions > 0 ? variant.clicks / variant.impressions : 0;
                      const isWinner = test.winnerIndex === vi;
                      return (
                        <div
                          key={vi}
                          className={`flex items-center gap-4 p-3 rounded-lg ${
                            isWinner
                              ? 'bg-profit/10 border border-profit/20'
                              : 'bg-white/[0.02] border border-white/5'
                          }`}
                        >
                          <span className="text-xs text-white/30 font-[family-name:var(--font-display)] w-6 text-center font-semibold">
                            {isWinner ? (
                              <Trophy size={14} className="text-profit mx-auto" />
                            ) : (
                              (vi + 1).toLocaleString('ar-u-nu-latn')
                            )}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-[family-name:var(--font-display)] line-clamp-1 ${
                              isWinner ? 'text-profit font-semibold' : 'text-white/80'
                            }`}>
                              {variant.title}
                            </p>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-white/50 font-[family-name:var(--font-display)]">
                            <span className="flex items-center gap-1" title={t('admin.headlineTests.impressions')}>
                              <Eye size={12} />
                              {variant.impressions.toLocaleString('ar-u-nu-latn')}
                            </span>
                            <span className="flex items-center gap-1" title={t('admin.headlineTests.clicks')}>
                              <MousePointer size={12} />
                              {variant.clicks.toLocaleString('ar-u-nu-latn')}
                            </span>
                            <span className="flex items-center gap-1 font-semibold text-gold" title={t('admin.headlineTests.ctr')}>
                              <TrendingUp size={12} />
                              {calcCtr(variant.impressions, variant.clicks)}
                            </span>
                            <CtrBar ctr={ctr} maxCtr={maxCtr} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer: Min sample note */}
                  <p className="text-white/20 text-xs font-[family-name:var(--font-display)] mt-3">
                    {t('admin.headlineTests.minSample')}: {test.minSample.toLocaleString('ar-u-nu-latn')} — {t('admin.headlineTests.statisticalNote')}
                  </p>
                </motion.div>
              </WidgetErrorBoundary>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Status Badge ───────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    running: { bg: 'bg-profit/10', text: 'text-profit', label: 'جارٍ' },
    completed: { bg: 'bg-gold/10', text: 'text-gold', label: 'مكتمل' },
    paused: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'متوقف' },
  };
  const c = config[status] ?? config.running;
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-[family-name:var(--font-display)] ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}
