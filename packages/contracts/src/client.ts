/**
 * Configured OpenAPI fetch client for the Thanawy backend.
 *
 * The base URL and auth middleware are wired here so the rest of the
 * frontend just imports a typed `client` and calls `client.GET(...)`,
 * `client.POST(...)`, etc. — every call is type-checked against
 * `src/generated/api.ts` (regenerated from swagger.json).
 */
import createClient, { type Middleware } from "openapi-fetch";

import { getContractsBaseUrl } from "./backend-url.js";
import type { paths } from "./generated/api.js";

/**
 * Auth middleware: attaches the bearer token from localStorage on the
 * client side, or the request cookie on the server side. Skips the
 * `/auth/login` and `/auth/register` paths so the login call itself
 * isn't blocked by stale tokens.
 *
 * Mirrors the auth header forwarding done by the catch-all proxy at
 * `src/app/api/[...path]/route.ts`. Keep the two policies consistent.
 */
const SKIP_AUTH_SUFFIXES = ["/auth/login", "/auth/register"];

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const path = new URL(request.url).pathname;
    if (SKIP_AUTH_SUFFIXES.some((s) => path.endsWith(s))) return request;

    if (typeof window !== "undefined") {
      const token =
        window.localStorage.getItem("access_token") ??
        window.localStorage.getItem("auth_token");
      if (token) {
        request.headers.set("Authorization", `Bearer ${token}`);
      }
    } else {
      const cookie = request.headers.get("cookie") ?? "";
      const match = /(?:^|;\s*)(?:access_token|auth_token)=([^;]+)/.exec(
        cookie,
      );
      if (match && match[1]) {
        request.headers.set(
          "Authorization",
          `Bearer ${decodeURIComponent(match[1])}`,
        );
      }
    }

    return request;
  },
};

export const client = createClient<paths>({
  baseUrl: getContractsBaseUrl(),
});

client.use(authMiddleware);

export type Client = typeof client;
