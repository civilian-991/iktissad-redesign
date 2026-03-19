import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthFromRequest, unauthorizedResponse } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ApiResponse } from '@/types';

// ─── Validation schema ────────────────────────────────────────────

const patchNoteSchema = z.object({
  // Toggle resolved: pass `resolved: true` to resolve, `resolved: false` to unresolve
  resolved: z.boolean().optional(),
  // Optional body update
  body: z.string().min(1).max(4000).optional(),
});

// ─── PATCH /api/editorial-notes/[articleId]/[noteId] ─────────────
// Toggle resolved state and/or update body of an existing note.

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ articleId: string; noteId: string }> }
) {
  const auth = await requireAuthFromRequest(request);
  if (!auth.authenticated) return unauthorizedResponse();

  const { articleId, noteId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const parsed = patchNoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(', ') } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Verify the note exists and belongs to the article
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing, error: fetchError } = await (admin.from('editorial_notes') as any)
    .select('id, resolved_at')
    .eq('id', noteId)
    .eq('article_id', articleId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json(
      { error: 'Note not found' } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  // Build the update payload
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (parsed.data.body !== undefined) {
    updatePayload.body = parsed.data.body;
  }

  if (parsed.data.resolved !== undefined) {
    if (parsed.data.resolved) {
      // Resolving: set resolved_at + resolved_by
      updatePayload.resolved_at = new Date().toISOString();
      updatePayload.resolved_by = auth.userId ?? null;
    } else {
      // Unresolving: clear both fields
      updatePayload.resolved_at = null;
      updatePayload.resolved_by = null;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error: updateError } = await (admin.from('editorial_notes') as any)
    .update(updatePayload)
    .eq('id', noteId)
    .select(`
      *,
      author:author_id ( id, name, avatar )
    `)
    .single();

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  const r = row as Record<string, unknown>;
  const authorRow = r.author as { id: string; name: string; avatar: string | null } | null;

  const note = {
    id: r.id as string,
    articleId: r.article_id as string,
    parentId: (r.parent_id as string | null) ?? null,
    body: r.body as string,
    author: authorRow
      ? { id: authorRow.id, name: authorRow.name, avatar: authorRow.avatar ?? null }
      : null,
    resolvedAt: (r.resolved_at as string | null) ?? null,
    resolvedBy: (r.resolved_by as string | null) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    replies: [],
  };

  return NextResponse.json({ data: note } satisfies ApiResponse<typeof note>);
}
