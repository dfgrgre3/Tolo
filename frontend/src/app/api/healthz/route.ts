import { NextResponse } from "next/server";

// Lightweight liveness probe for the frontend container. Referenced by
// docker-compose.production.yml's healthcheck and by apiRoutes.healthz
// (frontend/src/lib/api/routes.ts). Intentionally does not depend on the
// backend being reachable — it only proves the Next.js server is alive.
export async function GET() {
  return NextResponse.json({ status: "ok" }, { status: 200 });
}
