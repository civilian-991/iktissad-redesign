import { NextRequest, NextResponse } from 'next/server';
import { unauthorizedResponse, requireRole, forbiddenResponse, csrfForbiddenResponse } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ApiResponse } from '@/types';

export interface NewsletterSubscriber {
  id: string;
  email: string;
  status: 'active' | 'unsubscribed';
  subscribedAt: string;
}

interface NewsletterSubscriberRow {
  id: string;
  email: string;
  status: 'active' | 'unsubscribed';
  subscribed_at: string;
}

function mapRow(row: NewsletterSubscriberRow): NewsletterSubscriber {
  return {
    id: row.id,
    email: row.email,
    status: row.status,
    subscribedAt: row.subscribed_at,
  };
}

// ─── GET /api/admin/newsletter-subscribers ───────────────────────
// List free-tier newsletter subscribers (the `newsletter_subscribers`
// table — distinct from the paid `subscribers` table at /admin/subscribers).
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["super_admin", "editor"]);
  if (!auth.authenticated) return unauthorizedResponse();
  if (auth.csrfFailed) return csrfForbiddenResponse();
  if (auth.forbidden) return forbiddenResponse();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const status = searchParams.get('status');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (admin.from('newsletter_subscribers') as any).select('*', { count: 'exact' });

  if (search) {
    query = query.ilike('email', `%${search.replace(/[%,]/g, ' ')}%`);
  }
  if (status === 'active' || status === 'unsubscribed') {
    query = query.eq('status', status);
  }

  const start = (page - 1) * limit;
  const { data, count, error } = await query
    .order('subscribed_at', { ascending: false })
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
  } satisfies ApiResponse<NewsletterSubscriber[]>);
}
