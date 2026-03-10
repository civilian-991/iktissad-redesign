'use client';

/**
 * Plan Edit Form — prefills from SWR, same form as new
 */

import useSWR from 'swr';
import { Loader2, AlertTriangle } from 'lucide-react';
import { swrFetcher, subscriptionPlanKey } from '@/lib/api-client';
import type { SubscriptionPlan, ApiResponse } from '@/lib/api-client';
import NewPlanFormClient from '../new/PlanFormClient';

interface Props {
  id: string;
}

export default function PlanEditFormClient({ id }: Props) {
  const { data, isLoading, error } = useSWR<ApiResponse<SubscriptionPlan>>(
    subscriptionPlanKey(id),
    swrFetcher,
    { revalidateOnFocus: false }
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-10 h-10 text-gold/50 animate-spin" />
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="text-center py-20">
        <AlertTriangle size={40} className="mx-auto text-loss mb-4" />
        <p className="text-white/50 font-[family-name:var(--font-display)]">لم يتم العثور على الخطة</p>
      </div>
    );
  }

  return <NewPlanFormClient plan={data.data} />;
}
