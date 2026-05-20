import SectionEditClient from './SectionEditClient';

export default async function SectionEditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <SectionEditClient slug={slug} />;
}
