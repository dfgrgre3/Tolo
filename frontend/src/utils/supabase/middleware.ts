// Deprecated: Supabase middleware is no longer used.
// Clerk is the exclusive source of truth for authentication.
// Supabase is restricted to storage/CDN operations.

import { NextResponse } from "next/server";

export const createClient = async () => {
  return NextResponse.next();
};
