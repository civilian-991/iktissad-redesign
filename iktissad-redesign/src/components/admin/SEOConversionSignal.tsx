"use client";

import { useEffect, useRef, useState } from "react";
import {
  BarChart2,
  TrendingUp,
  Minus,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import type {
  ConversionInsight,
  ConversionSignalResult,
} from "@/app/api/ai/seo-conversion-signal/route";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SEOConversionSignalProps {
  sectionSlug?: string;
  articleType?: string;
}

// ---------------------------------------------------------------------------
// Insight row
// ---------------------------------------------------------------------------

interface InsightRowProps {
  insight: ConversionInsight;
}

function InsightRow({ insight }: InsightRowProps) {
  const iconProps = { size: 14, className: "shrink-0 mt-0.5" };

  let icon: React.ReactNode;
  let valueCls: string;

  if (insight.type === "positive") {
    icon = <TrendingUp {...iconProps} className={`${iconProps.className} text-green-400`} />;
    valueCls =
      "bg-green-900/40 border border-green-700 text-green-300";
  } else if (insight.type === "warning") {
    icon = <AlertTriangle {...iconProps} className={`${iconProps.className} text-red-400`} />;
    valueCls =
      "bg-red-900/40 border border-red-700 text-red-300";
  } else {
    icon = <Minus {...iconProps} className={`${iconProps.className} text-zinc-400`} />;
    valueCls =
      "bg-zinc-700/60 border border-zinc-600 text-zinc-300";
  }

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-2 min-w-0">
        {icon}
        <span className="text-sm text-zinc-300 leading-snug">{insight.label}</span>
      </div>
      <span
        className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums ${valueCls}`}
      >
        {insight.value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SEOConversionSignal({
  sectionSlug,
  articleType,
}: SEOConversionSignalProps) {
  const [result, setResult] = useState<ConversionSignalResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setFetchError(null);

    fetch("/api/ai/seo-conversion-signal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sectionSlug: sectionSlug || undefined,
        articleType: articleType || undefined,
      }),
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) {
          return res
            .json()
            .catch(() => ({ error: "خطأ غير معروف" }))
            .then((err: { error?: string }) => {
              throw new Error(err.error ?? `HTTP ${res.status}`);
            });
        }
        return res.json() as Promise<{ data?: ConversionSignalResult }>;
      })
      .then((json) => {
        if (json.data) {
          setResult(json.data);
        }
      })
      .catch((err: Error) => {
        if (err.name === "AbortError") return;
        setFetchError(err.message ?? "فشل تحميل إشارات الأداء");
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [sectionSlug, articleType]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 space-y-4 text-start"
      dir="rtl"
    >
      {/* Panel header */}
      <div className="flex items-center gap-2">
        <BarChart2 size={16} className="text-amber-400" />
        <h3 className="text-sm font-semibold text-white">إشارات الأداء</h3>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-3">
          <Loader2 size={15} className="animate-spin text-amber-400" />
          <span className="text-xs text-zinc-400">جاري تحليل البيانات…</span>
        </div>
      )}

      {/* Fetch error */}
      {fetchError && !loading && (
        <div className="flex items-center gap-2 rounded-lg bg-red-900/30 border border-red-700 px-3 py-2">
          <AlertTriangle size={14} className="text-red-400 shrink-0" />
          <p className="text-xs text-red-300">{fetchError}</p>
        </div>
      )}

      {/* Insufficient data */}
      {!loading && !fetchError && result && (result.insufficient || result.insights.length === 0) && (
        <p className="text-xs text-zinc-500 leading-relaxed">
          بيانات غير كافية — تحتاج إلى 5+ مقالات منشورة في هذا القسم لعرض
          الإشارات
          {result.sectionArticleCount > 0 && (
            <span className="block mt-1 text-zinc-600">
              (المقالات الحالية: {result.sectionArticleCount})
            </span>
          )}
        </p>
      )}

      {/* Insights list */}
      {!loading && !fetchError && result && !result.insufficient && result.insights.length > 0 && (
        <div className="space-y-3">
          {result.insights.map((insight, idx) => (
            <InsightRow key={idx} insight={insight} />
          ))}
          <p className="text-[10px] text-zinc-600 pt-1 border-t border-zinc-800">
            بناءً على {result.sectionArticleCount} مقال منشور في هذا القسم
          </p>
        </div>
      )}

      {/* No section selected yet */}
      {!loading && !fetchError && !result && (
        <p className="text-xs text-zinc-500 text-center py-2">
          اختر قسماً لعرض إشارات الأداء
        </p>
      )}
    </div>
  );
}
