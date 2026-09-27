"use client";

import { createBrowserClient } from "@supabase/ssr";

// The anon key is public by design. It reaches the browser, and Row Level
// Security is what stops it reading anything the signed-in user is not
// entitled to. The service_role key must never appear here.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
