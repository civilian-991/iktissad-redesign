import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'إدارة الدفع | الإقتصاد والأعمال',
  robots: { index: false, follow: false },
};

/**
 * /checkout/portal
 *
 * MPGS does not have a self-service billing portal (unlike Stripe).
 * Redirect authenticated users to their subscription management page,
 * or to login if unauthenticated.
 */
export default async function CheckoutPortalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/account/subscription');
  }

  redirect('/account/subscription');
}
