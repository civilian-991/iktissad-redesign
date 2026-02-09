import type { Metadata } from 'next';
import GroupPageClient from './PageClient';

export const metadata: Metadata = {
  title: 'المجموعة | الإقتصاد والأعمال',
  description: 'تعرف على مجموعة الإقتصاد والأعمال ومنشوراتها المتعددة',
};

export default function GroupPage() {
  return <GroupPageClient />;
}
