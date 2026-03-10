import { SectionsClient } from "./SectionsClient";

export default async function SectionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SectionsClient issueId={id} />;
}
