/**
 * Supabase Server Client
 *
 * For use in Server Components, API routes, and Server Actions.
 * Uses the anon key with cookie-based auth - respects RLS policies.
 *
 * In development, wraps the client with a query-timing proxy that logs
 * any operation taking longer than SLOW_QUERY_THRESHOLD_MS to the console.
 * This wrapper is a strict no-op in production.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";

const SLOW_QUERY_THRESHOLD_MS = 100;
const IS_DEV = process.env.NODE_ENV === "development";

/**
 * Wraps a Supabase query builder so that calling .then() (i.e. awaiting the
 * query) records the elapsed time and logs a warning when it exceeds the
 * threshold. Only active in development — returns the builder unchanged in
 * production to add zero overhead.
 *
 * We proxy at the SupabaseClient.from() level so it is transparent to all
 * callers and does not alter any types or method signatures.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrapClientWithTiming<T extends Record<string, any>>(client: T): T {
  if (!IS_DEV) return client;

  return new Proxy(client, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);

      // Only instrument the .from() method
      if (prop !== "from" || typeof value !== "function") {
        return value;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return function (table: string, ...args: any[]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const builder: any = (value as (...a: unknown[]) => unknown).call(target, table, ...args);

        return new Proxy(builder, {
          get(bTarget, bProp, bReceiver) {
            const bValue = Reflect.get(bTarget, bProp, bReceiver);

            // Intercept .then() which is called when the query is awaited
            if (bProp === "then" && typeof bValue === "function") {
              return function (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onFulfilled?: (value: any) => any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onRejected?: (reason: any) => any
              ) {
                const start = Date.now();
                return bValue.call(bTarget, onFulfilled, onRejected).finally(
                  () => {
                    const duration = Date.now() - start;
                    if (duration >= SLOW_QUERY_THRESHOLD_MS) {
                      // Attempt to infer the operation name from the builder
                      // url if available, otherwise fall back to a generic label.
                      const operation =
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (bTarget as any)?.url?.searchParams?.get("select") != null
                          ? "select"
                          : "query";
                      console.warn(
                        `[SLOW QUERY] ${duration}ms: ${table}.${operation}`
                      );
                    }
                  }
                );
              };
            }

            return bValue;
          },
        });
      };
    },
  });
}

export async function createClient() {
  const cookieStore = await cookies();

  const client = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll can fail when called from a Server Component.
            // This is safe to ignore if you have middleware refreshing sessions.
          }
        },
      },
    }
  );

  return wrapClientWithTiming(client);
}
