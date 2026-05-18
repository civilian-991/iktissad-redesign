/**
 * Admin Layout — Server Component wrapper
 * IKTISSAD Design System
 *
 * Verifies Supabase Auth session server-side, then renders the
 * client-side AdminLayoutClient with user info as props.
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import AdminLayoutClient from './AdminLayoutClient';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already handles unauthenticated redirects, but this is a
  // belt-and-suspenders check for the server component rendering phase.
  if (!user) {
    redirect('/login?redirect=/admin');
  }

  // Verify the user has an admin role in the admin_roles table AND that the
  // stored role value is one of the four supported tiers. Without this check,
  // any authenticated Supabase user could access /admin, or a user whose role
  // was tampered with could slip through with an unknown role value.
  const ALLOWED_ROLES = ['super_admin', 'editor', 'writer', 'finance', 'advertiser_manager'] as const;
  type AllowedRole = typeof ALLOWED_ROLES[number];

  const admin = createAdminClient();
  const { data: roleRow } = await admin
    .from('admin_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  const role = (roleRow as { role: string } | null)?.role;
  if (!role || !ALLOWED_ROLES.includes(role as AllowedRole)) {
    redirect('/login?redirect=/admin&error=unauthorized');
  }

  const displayName =
    (user.user_metadata?.name as string | undefined) ??
    user.email ??
    'Admin';
  const displayEmail = user.email ?? '';

  return (
    <AdminLayoutClient displayName={displayName} displayEmail={displayEmail}>
      {children}
    </AdminLayoutClient>
  );
}
