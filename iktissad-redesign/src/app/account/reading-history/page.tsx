import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ReadingHistoryClient from './PageClient';

export const metadata: Metadata = {
  title: 'سجل القراءة — اقتصاد',
  description: 'المقالات التي قرأتها في مجلة الإقتصاد والأعمال',
  robots: { index: false, follow: false },
};

export default async function ReadingHistoryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/account/reading-history');
  }

  return <ReadingHistoryClient />;
}
