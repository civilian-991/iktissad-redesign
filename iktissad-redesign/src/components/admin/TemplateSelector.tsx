'use client';

import React, { useState } from 'react';
import { FileText, Newspaper, BarChart3, MessageSquare, PenTool, Database, ChevronDown } from 'lucide-react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';
import { useTranslation } from '@/lib/i18n';
import type { ApiResponse } from '@/types';

interface ArticleTemplate {
  id: string;
  name: string;
  name_en: string;
  description: string;
  template_body: unknown;
  category: string;
  created_at: string;
}

interface TemplateSelectorProps {
  onSelect: (templateBody: unknown) => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  news: <Newspaper size={16} />,
  report: <BarChart3 size={16} />,
  interview: <MessageSquare size={16} />,
  opinion: <PenTool size={16} />,
  data: <Database size={16} />,
  general: <FileText size={16} />,
};

export default function TemplateSelector({ onSelect }: TemplateSelectorProps) {
  const { t, locale } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const { data } = useSWR<ApiResponse<ArticleTemplate[]>>(
    '/api/admin/templates',
    swrFetcher
  );

  const templates = (data?.data ?? []) as unknown as ArticleTemplate[];

  if (templates.length === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-[family-name:var(--font-display)] font-semibold text-charcoal/60 border border-sand hover:border-gold/50 hover:text-gold transition-all rounded-sm"
      >
        <FileText size={14} />
        {t('engagement.templates.select')}
        <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full inset-x-0 mt-1 z-20 bg-paper border border-sand shadow-lg min-w-[320px]">
          {/* No template option */}
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setIsOpen(false);
            }}
            className="w-full text-start flex items-center gap-3 px-4 py-3 hover:bg-cream/60 transition-colors border-b border-sand/40"
          >
            <div className="w-8 h-8 rounded bg-obsidian/[0.04] flex items-center justify-center text-charcoal/30">
              <FileText size={14} />
            </div>
            <div>
              <p className="text-[13px] font-[family-name:var(--font-display)] font-semibold text-charcoal/60">
                {t('engagement.templates.no_template')}
              </p>
            </div>
          </button>

          {/* Templates */}
          {templates.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => {
                const body = typeof tpl.template_body === 'string'
                  ? JSON.parse(tpl.template_body)
                  : tpl.template_body;
                onSelect(body);
                setIsOpen(false);
              }}
              className="w-full text-start flex items-center gap-3 px-4 py-3 hover:bg-cream/60 transition-colors border-b border-sand/40 last:border-b-0"
            >
              <div className="w-8 h-8 rounded bg-gold/10 flex items-center justify-center text-gold">
                {CATEGORY_ICONS[tpl.category] || CATEGORY_ICONS.general}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-[family-name:var(--font-display)] font-semibold text-ink">
                  {locale === 'en' && tpl.name_en ? tpl.name_en : tpl.name}
                </p>
                {tpl.description && (
                  <p className="text-[11px] text-charcoal/40 truncate mt-0.5">
                    {tpl.description}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
