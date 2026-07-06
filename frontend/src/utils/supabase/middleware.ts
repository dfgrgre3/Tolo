// Supabase middleware is no longer used.
// Authentication is handled by the backend API.

import { NextResponse } from "next/server";

export const createClient = async () => {
  return NextResponse.next();
};
