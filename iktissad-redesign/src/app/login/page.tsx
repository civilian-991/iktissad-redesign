import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LoginClient from './LoginClient';

export const metadata: Metadata = {
  title: 'تسجيل الدخول | الإقتصاد والأعمال',
  description: 'تسجيل الدخول إلى لوحة التحكم',
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const params = await searchParams;

  // Already logged in — send to the redirect param or /admin
  if (user) {
    redirect(params.redirect ?? '/admin');
  }

  return <LoginClient redirectTo={params.redirect} />;
}
