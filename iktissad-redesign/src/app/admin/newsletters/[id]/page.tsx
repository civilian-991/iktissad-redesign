/**
 * Admin — Edit Newsletter Page — Phase 4.3
 *
 * Fetches the newsletter by ID and renders NewsletterBuilder in edit mode.
 */

'use client';

import { use } from 'react';
import useSWR from 'swr';
import { Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import NewsletterBuilder from '@/components/admin/NewsletterBuilder';
import { swrFetcher } from '@/lib/api-client';
import type { Newsletter, ApiResponse } from '@/types';

export default function EditNewsletterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data, isLoading, error } = useSWR<ApiResponse<Newsletter>>(
    `/api/newsletters/${id}`,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={32} className="animate-spin text-gold/50" />
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <AlertCircle size={48} className="text-red-400/60 mb-4" />
        <p className="text-white/50 font-[family-name:var(--font-display)] mb-4">
          تعذّر تحميل النشرة
        </p>
        <Link
          href="/admin/newsletters"
          className="text-gold hover:underline font-[family-name:var(--font-display)] text-sm"
        >
          العودة إلى النشرات
        </Link>
      </div>
    );
  }

  return <NewsletterBuilder newsletter={data.data} />;
}
