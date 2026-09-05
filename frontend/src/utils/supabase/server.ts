/**
 * @deprecated server.ts is deprecated.
 * Import from '@/utils/supabase/server-user' for authenticated user operations (RLS enforced)
 * or '@/utils/supabase/server-admin' for privileged administrative tasks (Service Role Key).
 */
export { createClient } from "./server-user";
export { createAdminClient } from "./server-admin";