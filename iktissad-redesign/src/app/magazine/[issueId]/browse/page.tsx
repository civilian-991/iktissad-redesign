import type { Metadata } from 'next';
import MagazineBrowsePageClient from './PageClient';

export async function generateMetadata({ params }: { params: Promise<{ issueId: string }> }): Promise<Metadata> {
  const { issueId } = await params;
  return {
    title: `العدد ${issueId} | الإقتصاد والأعمال`,
    description: `تصفح العدد ${issueId} من مجلة الإقتصاد والأعمال`,
  };
}

export default function MagazineBrowsePage({ params }: { params: Promise<{ issueId: string }> }) {
  return <MagazineBrowsePageClient params={params} />;
}
