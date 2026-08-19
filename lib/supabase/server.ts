import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/types/database';

/**
 * Server-side Supabase client for use inside Server Components, Route
 * Handlers and Server Actions. Reads/writes the auth session via cookies so
 * the session survives across requests. Still uses only the public anon
 * key — RLS enforces per-user access, exactly as it does in the browser.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Called from a Server Component — middleware refreshes the
            // session instead. Safe to ignore.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // See note above.
          }
        },
      },
    }
  );
}

/**
 * Service-role client for privileged server-only operations (never import
 * this from anything that could run in the browser). Currently unused by
 * the app itself — AI routes use the user's session client so RLS still
 * applies — but kept available for future admin-only server routes.
 */
export function createServiceRoleClient() {
  return createSupabaseJsClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
