'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/types/database';

/**
 * Browser-side Supabase client. Safe to use in Client Components — it only
 * ever uses the public anon key, and all data access is protected by the
 * Row Level Security policies defined in supabase/migrations/0001_init.sql.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
