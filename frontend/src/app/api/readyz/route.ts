import { NextResponse } from "next/server";
import { getBackendApiUrl } from "@/lib/api/backend-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Readiness probe: proves the frontend AND its required backend dependency
// are reachable. Unlike /api/healthz (liveness — frontend process alive),
// this returns 200 only when the Go backend answers its own readiness gate.
//
// Design notes:
// - Unauthenticated by intent: orchestrators cannot present a session.
//   The backend /health/ready endpoint must be public.
// - No cascading failure: any backend/network/config error is caught and
//   reported as 503 with a backend status label — never a thrown 500.
// - Short, fixed 5s budget so readiness checks fail fast instead of
//   holding orchestrator threads.
const READY_TIMEOUT_MS = 5_000;

export async function GET() {
  let backendUrl: string;
  try {
    backendUrl = getBackendApiUrl("/health/ready");
  } catch (err) {
    return NextResponse.json(
      {
        status: "not-ready",
        backend: "unconfigured",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 503 },
    );
  }

  try {
    const response = await fetch(backendUrl, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(READY_TIMEOUT_MS),
    });
    if (!response.ok) {
      return NextResponse.json(
        { status: "not-ready", backend: `http-${response.status}` },
        { status: 503 },
      );
    }
    return NextResponse.json({ status: "ready", backend: "ready" }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      {
        status: "not-ready",
        backend: "unreachable",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 503 },
    );
  }
}
