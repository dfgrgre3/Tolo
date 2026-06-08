import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const createClient = (clerkToken?: string) =>
  createSupabaseClient(
    supabaseUrl!,
    supabaseKey!,
    clerkToken ? {
      global: {
        headers: {
          Authorization: `Bearer ${clerkToken}`,
        },
      },
    } : {}
  );
