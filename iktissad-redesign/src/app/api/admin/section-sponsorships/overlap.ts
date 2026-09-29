import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Returns an Arabic error message if another active sponsorship of the same
 * section overlaps [startDate, endDate], or null if the period is free.
 */
export async function findOverlappingSponsorship(
  sectionId: string,
  startDate: string,
  endDate: string,
  excludeId?: string
): Promise<string | null> {
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (admin.from("section_sponsorships") as any)
    .select("start_date, end_date, advertisers:advertiser_id ( name )")
    .eq("section_id", sectionId)
    .eq("active", true)
    .lte("start_date", endDate)
    .gte("end_date", startDate)
    .limit(1);
  if (excludeId) query = query.neq("id", excludeId);

  const { data } = await query;
  const clash = data?.[0];
  if (!clash) return null;
  return `القسم محجوز لـ ${clash.advertisers?.name ?? "راعٍ آخر"} من ${clash.start_date} إلى ${clash.end_date}`;
}
