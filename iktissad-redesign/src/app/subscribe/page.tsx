import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SubscribePageClient from './PageClient';

export const metadata: Metadata = {
  title: 'اشترك في إقتصاد | Iktissad Subscribe',
  description: 'اشترك في مجلة الإقتصاد والأعمال واحصل على وصول كامل للمجلة الرقمية والأرشيف الشامل',
};

export default async function SubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  // Check if user already has an active subscription — redirect to account
  const { data: { user } } = await supabase.auth.getUser();

  if (user?.email) {
    const { data: subscriber } = await supabase
      .from('subscribers')
      .select('status, plan_id')
      .eq('email', user.email)
      .in('status', ['active', 'trialing'])
      .maybeSingle();

    if (subscriber) {
      redirect('/account/subscription');
    }
  }

  // Fetch active subscription plans
  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  return <SubscribePageClient plans={(plans ?? []) as any} redirectTo={params.redirect} />;
}
