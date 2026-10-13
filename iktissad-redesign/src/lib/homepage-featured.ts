/**
 * Homepage featured lineup
 *
 * Editors pin up to HOMEPAGE_FEATURED_SLOTS articles into the homepage Hero
 * in a fixed order (slot 1 = lead story). Slots left empty fill with the
 * newest featured articles, as before.
 *
 * The pinned order lives in site_settings under HOMEPAGE_FEATURED_KEY as
 * `{ order: string[] }` (article ids) rather than a column on articles, so
 * there is exactly one ordering and unpinning never needs a bulk update.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export const HOMEPAGE_FEATURED_KEY = "homepage_featured";
export const HOMEPAGE_FEATURED_SLOTS = 4;

export interface HomepageFeaturedSetting {
  order: string[];
}

/** Read the pinned article ids, in slot order. Never throws. */
export async function getHomepageFeaturedOrder(): Promise<string[]> {
  try {
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (admin.from("site_settings") as any)
      .select("value")
      .eq("key", HOMEPAGE_FEATURED_KEY)
      .maybeSingle();
    const order = (data?.value as HomepageFeaturedSetting | undefined)?.order;
    return Array.isArray(order)
      ? order.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}
