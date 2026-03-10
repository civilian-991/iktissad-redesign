/**
 * Admin Layout — Server Component wrapper
 * IKTISSAD Design System
 *
 * Verifies Supabase Auth session server-side, then renders the
 * client-side AdminLayoutClient with user info as props.
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
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
