import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import * as jose from "jose";
import { createClient } from "@/utils/supabase/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/ai/:path*",
    "/profile/:path*",
    "/progress/:path*",
    "/tasks/:path*",
    "/schedule/:path*",
    "/settings/:path*",
    "/academy/:path*",
    "/achievements/:path*",
    "/billing/:path*",
    "/goals/:path*",
    "/leaderboard/:path*",
    "/notifications/:path*",
    "/subscription/:path*",
    "/time/:path*",
  ],
};

const JWT_SECRET = process.env.JWT_SECRET || "fallback-jwt-secret-for-dev-only";

export async function middleware(request: NextRequest) {
  // 1. Refresh Supabase session and get the response containing updated cookies
  const response = await createClient(request);

  // 2. Fetch the access token (check response cookies first, then fallback to request cookies)
  const token = response.cookies.get("access_token")?.value || request.cookies.get("access_token")?.value;

  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    await jose.jwtVerify(token, secret);
    return response;
  } catch (error) {
    console.error("JWT verification failed in Student Middleware:", error);
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);

    const redirectResponse = NextResponse.redirect(url);
    redirectResponse.cookies.delete("access_token");
    redirectResponse.cookies.delete("refresh_token");
    return redirectResponse;
  }
}
