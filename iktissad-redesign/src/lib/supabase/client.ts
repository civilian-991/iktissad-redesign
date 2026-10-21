/**
 * Supabase Browser Client
 *
 * For use in client components ('use client').
 * Uses the anon key - respects RLS policies.
 */

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

const lockQueues = new Map<string, Promise<void>>();

/**
 * Serialises this tab's auth work (session load, token refresh) in memory.
 *
 * Replaces the default cross-tab navigator.locks lock, which on Android
 * (backgrounded tabs) times out and rejects unhandled, and throws
 * SecurityError where site storage is blocked — hundreds of Sentry events a
 * day. Supabase's own processLock would do, but it never clears its timeout
 * timer and warns "acquisition timed out" in the console 10s after every
 * call. Concurrent refreshes from two tabs are absorbed by GoTrue's
 * refresh-token reuse window.
 *
 * acquireTimeout 0 means "only if free" (the auto-refresh tick); GoTrue skips
 * the tick when the error carries isAcquireTimeout.
 */
async function inPageLock<R>(name: string, acquireTimeout: number, fn: () => Promise<R>): Promise<R> {
  const busy = lockQueues.get(name);
  if (busy && acquireTimeout === 0) {
    throw Object.assign(new Error(`Auth lock "${name}" is busy`), { isAcquireTimeout: true });
  }
  const run = (busy ?? Promise.resolve()).then(fn);
  const settled = run.then(
    () => undefined,
    () => undefined
  );
  lockQueues.set(name, settled);
  void settled.then(() => {
    if (lockQueues.get(name) === settled) lockQueues.delete(name);
  });
  return run;
}

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { lock: inPageLock } }
  );
}
