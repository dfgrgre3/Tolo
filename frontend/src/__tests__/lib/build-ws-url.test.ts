import { describe, expect, it, vi } from "vitest";
import { buildAppUserWebSocketUrl } from "@/lib/realtime/build-ws-url";

describe("buildAppUserWebSocketUrl", () => {
  it("uses the session cookie and never puts credentials in the URL", () => {
    vi.stubEnv("NEXT_PUBLIC_WS_HOST", "ws.example.test");
    vi.stubEnv("NODE_ENV", "production");

    const url = buildAppUserWebSocketUrl();

    expect(url).toBe("wss://ws.example.test/api/v1/ws");
    expect(url).not.toContain("access_token");
    expect(url).not.toContain("token=");
  });
});
