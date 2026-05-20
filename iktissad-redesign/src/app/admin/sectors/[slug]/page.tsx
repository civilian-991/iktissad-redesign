import SectorEditClient from './SectorEditClient';

export default async function SectorEditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <SectorEditClient slug={slug} />;
}
