import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const createClient = (cookieStore?: Awaited<ReturnType<typeof cookies>>, clerkToken?: string) => {
  return createSupabaseClient(
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
};
