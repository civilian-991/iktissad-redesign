'use client';

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/client";

/**
 * Identifies the currently logged-in Supabase user in Sentry.
 * Mount this once inside RootLayout (inside <Providers> so it renders client-side).
 * When the user is not authenticated, Sentry user context is cleared.
 */
export default function SentryUserIdentification() {
  useEffect(() => {
    const supabase = createClient();

    // Set user on initial mount
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        Sentry.setUser({
          id: data.user.id,
          email: data.user.email ?? undefined,
        });
      } else {
        Sentry.setUser(null);
      }
    });

    // Keep Sentry user context in sync with auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        Sentry.setUser({
          id: session.user.id,
          email: session.user.email ?? undefined,
        });
      } else {
        Sentry.setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
