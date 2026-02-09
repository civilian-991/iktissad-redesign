import type { Metadata } from 'next';
import TeamPageClient from './PageClient';

export const metadata: Metadata = {
  title: 'فريق العمل | الإقتصاد والأعمال',
  description: 'تعرف على فريق عمل مجلة الإقتصاد والأعمال من صحفيين ومحللين',
};

export default function TeamPage() {
  return <TeamPageClient />;
}
