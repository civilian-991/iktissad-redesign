import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import SpreadBuilderClient from "./SpreadBuilderClient";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("magazine_issues")
    .select("title, issue_number")
    .eq("id", id)
    .single();

  const title = data?.title ?? `العدد`;
  return {
    title: `منشئ الصفحات — ${title} | الإقتصاد والأعمال`,
    robots: { index: false },
  };
}

export default async function SpreadBuilderPage({ params }: Props) {
  const { id } = await params;

  return <SpreadBuilderClient issueId={id} />;
}
