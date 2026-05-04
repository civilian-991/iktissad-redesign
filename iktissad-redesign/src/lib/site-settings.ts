/**
 * Server-side helper to read public site_settings entries.
 * Pages call this in their server wrapper, then pass values to PageClient as props.
 *
 * Settings shapes are defined per-key; consumers should know what to expect.
 */
import { createAdminClient } from '@/lib/supabase/admin';

export interface ContactOffice {
  city: string;
  cityEn?: string;
  country?: string;
  phone: string;
}

export interface ContactInfo {
  email?: string;
  offices?: ContactOffice[];
  address?: string;
  addressEn?: string;
  hours?: string;
  hoursEn?: string;
}

export interface AdvertiseStat {
  value: string;
  label: { ar: string; en: string };
}

export interface AdvertiseStats {
  stats?: AdvertiseStat[];
  audiencePercentages?: number[];
}

export interface AboutSection {
  title: { ar: string; en: string };
  description?: { ar: string; en: string };
}

export interface AboutContent {
  sections?: AboutSection[];
}

export interface AboutStats {
  conferenceStats?: Array<{ value: string; labelAr: string; labelEn: string }>;
}

/** Fetch a single site_settings row by key. Returns null on miss. */
export async function getSiteSetting<T>(key: string): Promise<T | null> {
  const sb = createAdminClient();
  const { data, error } = await (sb as unknown as { from: (t: string) => { select: (s: string) => { eq: (col: string, v: string) => { single: () => Promise<{ data: { value: T } | null; error: unknown }> } } } })
    .from('site_settings')
    .select('value')
    .eq('key', key)
    .single();
  if (error || !data) return null;
  return data.value;
}
