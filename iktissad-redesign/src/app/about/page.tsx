import type { Metadata } from 'next';
import AboutPageClient from './PageClient';
import { getSiteSetting, type AboutStats } from '@/lib/site-settings';

export const metadata: Metadata = {
  title: 'مجموعة الاقتصاد والأعمال — من الفهم إلى القرار',
  description: 'منذ عام 1977، تعمل مجموعة الاقتصاد والأعمال في المساحة بين الخبر والقرار — موقع، مجلة، مجلة الدفاعية، مجلة الحسناء، ومؤتمرات ضمن رؤية واحدة.',
};

export default async function AboutPage() {
  const aboutStats = await getSiteSetting<AboutStats>('about_stats');
  return <AboutPageClient aboutStats={aboutStats} />;
}
