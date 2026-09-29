import type { Metadata } from 'next';
import PartnerContentPageClient from './PageClient';

export const revalidate = 3600; // 1 hour

export const metadata: Metadata = {
  title: 'محتوى الشركاء | الإقتصاد والأعمال',
  description: 'مقالات ومقابلات وتحليلات يرعاها شركاء الإقتصاد والأعمال — محتوى مدفوع ومُعلَّم بوضوح ومنفصل عن التغطية الإخبارية.',
  alternates: { canonical: '/partner-content' },
};

export default function PartnerContentPage() {
  return <PartnerContentPageClient />;
}
