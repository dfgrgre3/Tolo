import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Schema for the tables this app writes to directly through Supabase.
 * Everything else goes through the Go backend, so only `subscribers` is typed.
 */
export interface Database {
  public: {
    Tables: {
      subscribers: {
        Row: { id: string; email: string; created_at: string };
        Insert: { email: string };
        Update: { email?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Singleton pattern to prevent multiple Supabase client instances
let clientInstance: ReturnType<typeof createSupabaseClient<Database>> | null = null;

export const createClient = () => {
  if (clientInstance) {
    return clientInstance;
  }

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  clientInstance = createSupabaseClient<Database>(supabaseUrl, supabaseKey);
  return clientInstance;
};
