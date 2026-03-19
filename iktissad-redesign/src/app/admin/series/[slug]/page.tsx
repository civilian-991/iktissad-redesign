import type { Metadata } from "next";
import SeriesDetailClient from "./SeriesDetailClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `إدارة الملف: ${slug} | لوحة التحكم`,
  };
}

export default async function SeriesDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <SeriesDetailClient slug={slug} />;
}
