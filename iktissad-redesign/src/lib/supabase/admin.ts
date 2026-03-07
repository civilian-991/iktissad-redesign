/**
 * Supabase Admin Client (Service Role)
 *
 * Bypasses Row-Level Security. Use ONLY in trusted server-side code
 * (API routes, server actions) for admin operations like seeding,
 * migrations, or elevated CRUD.
 *
 * NEVER expose this client or the service role key to the browser.
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
