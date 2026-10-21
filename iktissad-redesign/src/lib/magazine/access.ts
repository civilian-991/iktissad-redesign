import type { createClient } from '@/lib/supabase/server';

/**
 * Whether the magazine is open to every reader, subscriber or not.
 *
 * Controlled from Admin → Settings → Paywall ("magazineFree" in the paywall
 * site setting). When off, only active subscribers can read past the free
 * preview pages. PDF downloads stay subscriber-only either way.
 */
export async function isMagazineFree(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('site_settings')
    .select('value')
    .eq('key', 'paywall')
    .maybeSingle();
  return data?.value?.magazineFree === true;
}
