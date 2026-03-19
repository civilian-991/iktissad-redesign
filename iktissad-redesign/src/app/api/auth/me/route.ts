import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ApiResponse } from '@/types';

export interface MeData {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

/**
 * GET /api/auth/me
 *
 * Returns the authenticated user's id, display name, email, and avatar URL.
 * Used by client components that need the current user's identity (e.g.
 * Realtime Presence tracking) without a full server-component wrapper.
 *
 * 401 when no session is present. 200 + data otherwise.
 */
export async function GET(): Promise<NextResponse<ApiResponse<MeData>>> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { data: null as unknown as MeData, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Pull display name + avatar from the user_metadata set at sign-up / profile update.
  // Falls back to the email prefix so there is always a non-empty name.
  const meta = user.user_metadata ?? {};
  const name: string =
    (meta.full_name as string | undefined) ||
    (meta.name as string | undefined) ||
    user.email?.split('@')[0] ||
    'مستخدم';

  const avatarUrl: string | undefined =
    (meta.avatar_url as string | undefined) ||
    (meta.picture as string | undefined) ||
    undefined;

  const data: MeData = {
    id: user.id,
    name,
    email: user.email ?? '',
    avatarUrl,
  };

  return NextResponse.json({ data }, { status: 200 });
}
