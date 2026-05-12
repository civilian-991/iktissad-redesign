import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types";

/**
 * Admin-gated backfill: enumerate all files in the storage buckets and
 * insert a media row for each (idempotent — skipped when a row with the
 * same url already exists). Built because images uploaded by migration
 * scripts went straight into storage without registering in the
 * `media` table, so they never showed in /admin/media.
 *
 * POST /api/admin/media-backfill
 *   ?bucket=articles|media|magazines|avatars (optional, defaults to all)
 *   ?dryRun=1 (optional, count only)
 */
const BUCKETS = ["articles", "media", "magazines", "avatars"] as const;
type Bucket = (typeof BUCKETS)[number];

interface StorageObject {
  name: string;
  metadata?: { size?: number; mimetype?: string };
}

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif",
  webp: "image/webp", svg: "image/svg+xml", avif: "image/avif",
  pdf: "application/pdf",
  mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm",
};

function guessMime(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const bucketParam = searchParams.get("bucket");
  const dryRun = searchParams.get("dryRun") === "1";
  const targetBuckets: Bucket[] = bucketParam && (BUCKETS as readonly string[]).includes(bucketParam)
    ? [bucketParam as Bucket]
    : [...BUCKETS];

  const admin = createAdminClient();

  // Pull every existing url so we can skip duplicates without N round-trips.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingRows } = await (admin.from("media") as any)
    .select("url")
    .limit(50000);
  const knownUrls = new Set<string>((existingRows ?? []).map((r: { url: string }) => r.url));

  const summary: Record<string, { scanned: number; inserted: number; skipped: number }> = {};

  for (const bucket of targetBuckets) {
    const stat = { scanned: 0, inserted: 0, skipped: 0 };
    const toInsert: Record<string, unknown>[] = [];

    // Recursively walk the bucket folder tree, paginating within each folder.
    const queue: string[] = [""];
    const pageSize = 1000;
    while (queue.length) {
      const prefix = queue.shift()!;
      let offset = 0;
      while (true) {
        const { data: entries, error } = await admin.storage.from(bucket).list(prefix, {
          limit: pageSize,
          offset,
          sortBy: { column: "name", order: "asc" },
        });
        if (error) break;
        const rows = (entries ?? []) as StorageObject[];
        if (rows.length === 0) break;

        for (const entry of rows) {
          if (entry.name === ".emptyFolderPlaceholder") continue;
          const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;

          // Folders have no metadata.size — recurse into them.
          if (!entry.metadata) {
            queue.push(fullPath);
            continue;
          }

          stat.scanned++;
          const { data: urlData } = admin.storage.from(bucket).getPublicUrl(fullPath);
          const publicUrl = urlData.publicUrl;
          if (knownUrls.has(publicUrl)) {
            stat.skipped++;
            continue;
          }
          knownUrls.add(publicUrl);
          toInsert.push({
            url: publicUrl,
            filename: entry.name,
            mime_type: entry.metadata.mimetype || guessMime(entry.name),
            size: entry.metadata.size ?? 0,
            alt: "",
            alt_en: "",
            folder: prefix || bucket,
          });
        }

        if (rows.length < pageSize) break;
        offset += pageSize;
      }
    }

    if (!dryRun && toInsert.length) {
      // Batch inserts to stay under Postgres parameter limits.
      const batchSize = 500;
      for (let i = 0; i < toInsert.length; i += batchSize) {
        const batch = toInsert.slice(i, i + batchSize);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (admin.from("media") as any).insert(batch);
        if (error) {
          return NextResponse.json(
            { error: `Insert failed for bucket ${bucket}: ${error.message}` } satisfies ApiResponse<never>,
            { status: 500 }
          );
        }
        stat.inserted += batch.length;
      }
    } else {
      stat.inserted = dryRun ? 0 : toInsert.length;
    }

    summary[bucket] = stat;
  }

  return NextResponse.json({ data: { dryRun, summary } });
}
