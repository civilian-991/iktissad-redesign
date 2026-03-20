import type { Metadata } from 'next';
import TagPageClient from './PageClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  return {
    title: `موضوع: ${decoded} — الإقتصاد والأعمال`,
    description: `مقالات واقتصاديات حول موضوع "${decoded}" من مجلة الإقتصاد والأعمال`,
  };
}

export default function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  return <TagPageClient params={params} />;
}
