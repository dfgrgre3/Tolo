import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Creates a privileged administrative Supabase client using the Service Role Key.
 *
 * SECURITY NOTICE:
 * - Bypasses Row Level Security (RLS).
 * - Enforces "server-only" import to prevent accidental bundling in client-side code.
 * - Requires explicit SUPABASE_SERVICE_ROLE_KEY environment variable.
 * - NEVER falls back to publishable/anon key.
 */
export const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL for admin Supabase client.");
  }

  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY: createAdminClient requires an explicit service role key and has no fallback."
    );
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};
