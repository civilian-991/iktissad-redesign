import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AccountDashboardClient from './AccountDashboardClient';

export const metadata: Metadata = {
  title: 'حسابي — اقتصاد',
  description: 'لوحة حسابك الشخصي — اشتراكاتك، مقالاتك المحفوظة، وسجل القراءة',
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/account');
  }

  return <AccountDashboardClient userId={user.id} userEmail={user.email ?? ''} />;
}
