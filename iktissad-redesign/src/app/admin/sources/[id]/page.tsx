import SourceDetailClient from './SourceDetailClient';

export default async function SourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SourceDetailClient id={id} />;
}
