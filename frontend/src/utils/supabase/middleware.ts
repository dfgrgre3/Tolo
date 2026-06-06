import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const createClient = async (request: NextRequest) => {
  // Create an unmodified response
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    },
  );

  // Essential step to refresh expired sessions and set correct cookie headers
  const { data: { user } } = await supabase.auth.getUser();

  // Propagate refreshed tokens to access_token and refresh_token cookies to keep application auth in sync
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    const currentAccessToken = request.cookies.get("access_token")?.value;
    if (session.access_token && session.access_token !== currentAccessToken) {
      const isProd = process.env.NODE_ENV === "production";
      supabaseResponse.cookies.set("access_token", session.access_token, {
        path: "/",
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
      });
      if (session.refresh_token) {
        supabaseResponse.cookies.set("refresh_token", session.refresh_token, {
          path: "/",
          httpOnly: true,
          secure: isProd,
          sameSite: "lax",
        });
      }
    }
  }

  return supabaseResponse;
};
