import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SubscriptionPageClient from './PageClient';

export const metadata: Metadata = {
  title: 'اشتراكي | الإقتصاد والأعمال',
  description: 'إدارة اشتراكك في مجلة الإقتصاد والأعمال — الخطة الحالية، سجل المدفوعات، وإدارة طريقة الدفع',
  robots: { index: false, follow: false },
};

export default async function AccountSubscriptionPage() {
  const supabase = await createClient();

  // Require authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/account/subscription');
  }

  // Fetch subscriber record with plan info
  const { data: subscriber } = await supabase
    .from('subscribers')
    .select(
      `
      id,
      status,
      current_period_start,
      current_period_end,
      trial_ends_at,
      canceled_at,
      plan_id,
      subscription_plans (
        id,
        name,
        name_ar,
        price_monthly,
        price_annual
      )
    `
    )
    .eq('email', user.email!)
    .maybeSingle();

  // Fetch payment history (most recent 20)
  const { data: payments } = subscriber
    ? await supabase
        .from('payments')
        .select('id, amount, currency, status, paid_at, description')
        .eq('subscriber_id', subscriber.id)
        .order('created_at', { ascending: false })
        .limit(20)
    : { data: [] };

  return (
    <SubscriptionPageClient
      subscriber={subscriber as any}
      payments={(payments ?? []) as any}
      userEmail={user.email ?? ''}
    />
  );
}
