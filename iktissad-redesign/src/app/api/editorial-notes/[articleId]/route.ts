import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthFromRequest, unauthorizedResponse } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ApiResponse } from '@/types';

// ─── Types ───────────────────────────────────────────────────────

export interface EditorialNoteAuthor {
  id: string;
  name: string;
  avatar: string | null;
}

export interface EditorialNote {
  id: string;
  articleId: string;
  parentId: string | null;
  body: string;
  author: EditorialNoteAuthor | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
  updatedAt: string;
  replies: EditorialNote[];
}

// ─── Helpers ─────────────────────────────────────────────────────

function mapNoteRow(row: Record<string, unknown>): Omit<EditorialNote, 'replies'> {
  const authorRow = row.author as { id: string; name: string; avatar: string | null } | null;
  return {
    id: row.id as string,
    articleId: row.article_id as string,
    parentId: (row.parent_id as string | null) ?? null,
    body: row.body as string,
    author: authorRow
      ? { id: authorRow.id, name: authorRow.name, avatar: authorRow.avatar ?? null }
      : null,
    resolvedAt: (row.resolved_at as string | null) ?? null,
    resolvedBy: (row.resolved_by as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/** Extract @username patterns from a comment body (alphanumeric + underscore, min 2 chars) */
function extractMentions(body: string): string[] {
  const matches = body.match(/@([a-zA-Z0-9_]{2,})/g) ?? [];
  return [...new Set(matches.map((m) => m.slice(1)))];
}

// ─── GET /api/editorial-notes/[articleId] ────────────────────────
// Returns all notes for an article, with top-level notes having a `replies` array.

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ articleId: string }> }
) {
  const auth = await requireAuthFromRequest(request);
  if (!auth.authenticated) return unauthorizedResponse();

  const { articleId } = await params;
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error } = await (admin.from('editorial_notes') as any)
    .select(`
      *,
      author:author_id ( id, name, avatar )
    `)
    .eq('article_id', articleId)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  // Build threaded tree: top-level notes with nested replies
  const allNotes: Record<string, EditorialNote> = {};
  const topLevel: EditorialNote[] = [];

  for (const row of rows ?? []) {
    const note: EditorialNote = { ...mapNoteRow(row as Record<string, unknown>), replies: [] };
    allNotes[note.id] = note;
  }

  for (const note of Object.values(allNotes)) {
    if (note.parentId && allNotes[note.parentId]) {
      allNotes[note.parentId].replies.push(note);
    } else if (!note.parentId) {
      topLevel.push(note);
    }
  }

  return NextResponse.json({ data: topLevel } satisfies ApiResponse<EditorialNote[]>);
}

// ─── Validation schema ────────────────────────────────────────────

const createNoteSchema = z.object({
  body: z.string().min(1).max(4000),
  parentId: z.string().uuid().optional().nullable(),
  isReviewRequest: z.boolean().optional().default(false),
});

// ─── POST /api/editorial-notes/[articleId] ────────────────────────
// Creates a new note; fires admin_notifications for any @mention found in body.

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ articleId: string }> }
) {
  const auth = await requireAuthFromRequest(request);
  if (!auth.authenticated) return unauthorizedResponse();

  const { articleId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const parsed = createNoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(', ') } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const { body: noteBody, parentId, isReviewRequest } = parsed.data;
  const admin = createAdminClient();

  // Insert the note
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin.from('editorial_notes') as any)
    .insert({
      article_id: articleId,
      parent_id: parentId ?? null,
      body: noteBody,
      author_id: auth.userId ?? null,
    })
    .select(`
      *,
      author:author_id ( id, name, avatar )
    `)
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  const note: EditorialNote = { ...mapNoteRow(row as Record<string, unknown>), replies: [] };

  // ── @mention notifications ────────────────────────────────────
  const mentions = extractMentions(noteBody);

  if (mentions.length > 0) {
    // Look up users by name (partial match on username portion)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: mentionedUsers } = await (admin.from('users') as any)
      .select('id, name')
      .in('name', mentions);

    if (mentionedUsers && mentionedUsers.length > 0) {
      const notifications = (mentionedUsers as { id: string; name: string }[])
        .filter((u) => u.id !== auth.userId) // Don't notify self
        .map((u) => ({
          type: 'editorial_mention',
          title: 'تم ذكرك في تعليق تحريري',
          body: noteBody.slice(0, 160),
          resource_id: articleId,
          recipient_id: u.id,
          is_read: false,
        }));

      if (notifications.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (admin.from('admin_notifications') as any).insert(notifications);
      }
    }
  }

  // ── Review request notification ───────────────────────────────
  if (isReviewRequest && auth.userId) {
    // Fetch the article to find the author/assignee to notify
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: articleRow } = await (admin.from('articles') as any)
      .select('author_id, title')
      .eq('id', articleId)
      .single();

    const recipientId = (articleRow as { author_id: string | null } | null)?.author_id;
    if (recipientId && recipientId !== auth.userId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin.from('admin_notifications') as any).insert({
        type: 'review_request',
        title: 'طُلبت مراجعتك لمقال',
        body: (articleRow as { title: string } | null)?.title ?? '',
        resource_id: articleId,
        recipient_id: recipientId,
        is_read: false,
      });
    }
  }

  return NextResponse.json({ data: note } satisfies ApiResponse<EditorialNote>, { status: 201 });
}
