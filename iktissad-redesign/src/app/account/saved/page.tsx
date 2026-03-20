import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SavedArticlesClient from './PageClient';

export const metadata: Metadata = {
  title: 'المقالات المحفوظة — اقتصاد',
  description: 'قائمة المقالات التي حفظتها في مجلة الإقتصاد والأعمال',
  robots: { index: false, follow: false },
};

export default async function SavedArticlesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/account/saved');
  }

  return <SavedArticlesClient />;
}
