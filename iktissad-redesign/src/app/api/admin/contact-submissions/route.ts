import { NextRequest, NextResponse } from 'next/server';
import { unauthorizedResponse, requireRole, forbiddenResponse, csrfForbiddenResponse } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ApiResponse } from '@/types';
import type { ContactSubmissionRow } from '@/lib/supabase/types';

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  ip: string | null;
  createdAt: string;
}

function mapRow(row: ContactSubmissionRow): ContactSubmission {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    subject: row.subject,
    message: row.message,
    ip: row.ip,
    createdAt: row.created_at,
  };
}

// ─── GET /api/admin/contact-submissions ──────────────────────────
// List contact submissions with pagination + free-text search.
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["super_admin", "editor"]);
  if (!auth.authenticated) return unauthorizedResponse();
  if (auth.csrfFailed) return csrfForbiddenResponse();
  if (auth.forbidden) return forbiddenResponse();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (admin.from('contact_submissions') as any).select('*', { count: 'exact' });

  if (search) {
    const q = search.replace(/[%,]/g, ' ');
    query = query.or(
      `name.ilike.%${q}%,email.ilike.%${q}%,subject.ilike.%${q}%,message.ilike.%${q}%`,
    );
  }

  const start = (page - 1) * limit;
  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(start, start + limit - 1);

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }

  const total = count ?? 0;
  return NextResponse.json({
    data: (data ?? []).map(mapRow),
    pagination: {
      page,
      pageSize: limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  } satisfies ApiResponse<ContactSubmission[]>);
}
