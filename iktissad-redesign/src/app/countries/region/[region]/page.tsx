/**
 * Region landing page for جغرافيا الاقتصاد — الخليج، المشرق العربي،
 * شمال أفريقيا، العالم.
 *
 * A static `region` segment sits ahead of the `[slug]` country route, so
 * /countries/region/gulf resolves here and /countries/uae still resolves to
 * the country page.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CountriesPageClient from '../../PageClient';
import { COUNTRY_REGIONS, type CountryRegion } from '@/lib/countries';

const REGION_META: Record<CountryRegion, { title: string; description: string }> = {
  gulf: {
    title: 'الخليج',
    description: 'أخبار وتحليلات اقتصاد دول الخليج: السعودية والإمارات والكويت وقطر والبحرين وعُمان.',
  },
  mashreq: {
    title: 'المشرق العربي',
    description: 'أخبار وتحليلات اقتصاد المشرق العربي: لبنان والأردن وسوريا والعراق وفلسطين.',
  },
  northafrica: {
    title: 'شمال أفريقيا',
    description: 'أخبار وتحليلات اقتصاد شمال أفريقيا: مصر والمغرب والجزائر وتونس وليبيا والسودان وموريتانيا.',
  },
  world: {
    title: 'العالم',
    description: 'أخبار وتحليلات الاقتصاد العالمي وأثره على أسواق المنطقة.',
  },
};

const isRegion = (v: string): v is CountryRegion =>
  (COUNTRY_REGIONS as readonly string[]).includes(v);

export function generateStaticParams() {
  return COUNTRY_REGIONS.map((region) => ({ region }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ region: string }> },
): Promise<Metadata> {
  const { region } = await params;
  if (!isRegion(region)) return { title: 'جغرافيا الاقتصاد | الإقتصاد والأعمال' };
  const meta = REGION_META[region];
  return {
    title: `${meta.title} | جغرافيا الاقتصاد | الإقتصاد والأعمال`,
    description: meta.description,
    alternates: { canonical: `/countries/region/${region}` },
  };
}

export default async function CountryRegionPage(
  { params }: { params: Promise<{ region: string }> },
) {
  const { region } = await params;
  if (!isRegion(region)) notFound();
  return <CountriesPageClient region={region} />;
}
