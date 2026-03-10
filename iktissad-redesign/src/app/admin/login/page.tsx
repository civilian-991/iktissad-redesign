/**
 * /admin/login — legacy redirect to the Supabase Auth login page.
 * Keeps any bookmarks to the old Stack Auth admin login working.
 */
import { redirect } from 'next/navigation';

export default function AdminLoginPage() {
  redirect('/login?redirect=/admin/dashboard');
}
