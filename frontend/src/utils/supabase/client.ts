import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Singleton pattern to prevent multiple Supabase client instances
let clientInstance: ReturnType<typeof createSupabaseClient> | null = null;

export const createClient = () => {
  if (clientInstance) {
    return clientInstance;
  }
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  clientInstance = createSupabaseClient(supabaseUrl, supabaseKey);
  return clientInstance;
};
