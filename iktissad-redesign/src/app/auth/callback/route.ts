// Handles OAuth redirect from Supabase (Google OAuth, magic link, etc.)
// NOTE: For Google OAuth to work, you must enable the Google provider in the
// Supabase dashboard under Authentication → Providers → Google, and add your
// Google OAuth client ID and secret from Google Cloud Console.
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
