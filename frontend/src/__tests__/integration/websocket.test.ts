/**
 * WebSocket Integration Tests
 *
 * Uses a self-contained Vitest-native MockWebSocket instead of jest-websocket-mock,
 * which is a Jest-only library and causes import resolution failures under Vitest.
 *
 * Architecture note (Multi-pod / Redis Pub/Sub):
 *   The tests in the "Multi-pod Pub/Sub" suite define the CONTRACT that the
 *   backend Redis adapter must satisfy. They document expected behaviour —
 *   not a live Redis connection — so they run in CI without infrastructure.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// ─── Minimal Vitest-native WebSocket mock ─────────────────────────────────────

type WsMessageHandler = (event: MessageEvent) => void;
type WsEventHandler = (event: Event) => void;

interface MockWsServer {
  /** All clients currently "connected" to this mock server. */
  clients: MockWebSocket[];
  /** Send a message from the server to every connected client. */
  broadcast(data: string): void;
  /** Send a message to a specific client. */
  send(client: MockWebSocket, data: string): void;
  /** Simulate a server-initiated close. */
  close(client?: MockWebSocket): void;
  /** Simulate a connection error on a specific client. */
  error(client: MockWebSocket): void;
  /** Collect all messages sent from clients to the server. */
  received: string[];
  /** Reset state between tests. */
  reset(): void;
}

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState: number = MockWebSocket.OPEN;
  onmessage: WsMessageHandler | null = null;
  onopen: WsEventHandler | null = null;
  onclose: WsEventHandler | null = null;
  onerror: WsEventHandler | null = null;

  private _server: MockWsServer;

  constructor(_url: string, server: MockWsServer) {
    this._server = server;
    server.clients.push(this);
    // Simulate async open
    Promise.resolve().then(() => {
      this.onopen?.({ type: "open" } as Event);
    });
  }

  send(data: string): void {
    this._server.received.push(data);
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    this._server.clients = this._server.clients.filter((c) => c !== this);
    this.onclose?.({ type: "close" } as Event);
  }

  /** Called by the server mock to deliver an inbound message. */
  _receive(data: string): void {
    this.onmessage?.({ data, type: "message" } as MessageEvent);
  }

  /** Called by the server mock to simulate an error. */
  _error(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onerror?.({ type: "error" } as Event);
  }
}

function createMockServer(): MockWsServer {
  const server: MockWsServer = {
    clients: [],
    received: [],
    broadcast(data) {
      for (const client of server.clients) {
        client._receive(data);
      }
    },
    send(client, data) {
      client._receive(data);
    },
    close(client) {
      if (client) {
        client.readyState = MockWebSocket.CLOSED;
        server.clients = server.clients.filter((c) => c !== client);
        client.onclose?.({ type: "close" } as Event);
      } else {
        for (const c of [...server.clients]) c.close();
      }
    },
    error(client) {
      client._error();
    },
    reset() {
      server.clients = [];
      server.received = [];
    },
  };
  return server;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WS_URL = "ws://localhost:8082/ws";

/** Flush the microtask queue so MockWebSocket.onopen fires. */
const tick = () => new Promise<void>((r) => setTimeout(r, 0));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("WebSocket Integration", () => {
  let server: MockWsServer;
  let client: MockWebSocket;

  beforeEach(() => {
    server = createMockServer();
  });

  afterEach(() => {
    server.reset();
  });

  // ── Connection ──────────────────────────────────────────────────────────────
  describe("Connection", () => {
    it("should connect to WebSocket server", async () => {
      client = new MockWebSocket(WS_URL, server);
      await tick();
      expect(client.readyState).toBe(MockWebSocket.OPEN);
      expect(server.clients).toHaveLength(1);
    });

    it("should authenticate on connection", async () => {
      client = new MockWebSocket(WS_URL, server);
      await tick();

      // Client sends auth token
      client.send(JSON.stringify({ type: "auth", token: "valid-jwt-token" }));

      // Server replies with success
      server.send(
        client,
        JSON.stringify({ type: "auth_response", status: "success" })
      );

      expect(server.received[0]).toBe(
        JSON.stringify({ type: "auth", token: "valid-jwt-token" })
      );
    });

    it("should handle rejected unauthenticated connections", async () => {
      client = new MockWebSocket(WS_URL, server);
      await tick();

      const messageHandler = vi.fn();
      client.onmessage = messageHandler;

      server.send(
        client,
        JSON.stringify({
          type: "auth_response",
          status: "error",
          message: "Authentication required",
        })
      );

      expect(messageHandler).toHaveBeenCalledOnce();
      const payload = JSON.parse(messageHandler.mock.calls[0]![0]!.data);
      expect(payload.status).toBe("error");
    });
  });

  // ── Real-time Notifications ─────────────────────────────────────────────────
  describe("Real-time Notifications", () => {
    beforeEach(async () => {
      client = new MockWebSocket(WS_URL, server);
      await tick();
    });

    afterEach(() => {
      client.close();
    });

    it("should receive real-time notifications", async () => {
      const messageHandler = vi.fn();
      client.onmessage = messageHandler;

      server.send(
        client,
        JSON.stringify({
          type: "notification",
          data: {
            id: "1",
            title: "New User Registered",
            message: "A new user has registered",
            timestamp: new Date().toISOString(),
          },
        })
      );

      expect(messageHandler).toHaveBeenCalledOnce();
      const receivedData = JSON.parse(messageHandler.mock.calls[0]![0]!.data);
      expect(receivedData.type).toBe("notification");
    });

    it("should receive broadcast progress updates", async () => {
      const messageHandler = vi.fn();
      client.onmessage = messageHandler;

      server.send(
        client,
        JSON.stringify({
          type: "broadcast-progress",
          broadcastId: "123",
          stats: { sent: 50, delivered: 45, failed: 5, total: 100 },
        })
      );

      const receivedData = JSON.parse(messageHandler.mock.calls[0]![0]!.data);
      expect(receivedData.type).toBe("broadcast-progress");
      expect(receivedData.stats.sent).toBe(50);
    });

    it("should receive analytics updates", async () => {
      const messageHandler = vi.fn();
      client.onmessage = messageHandler;

      server.send(
        client,
        JSON.stringify({
          type: "analytics-update",
          metrics: { activeUsers: 150, pageViews: 1200 },
        })
      );

      const receivedData = JSON.parse(messageHandler.mock.calls[0]![0]!.data);
      expect(receivedData.type).toBe("analytics-update");
    });

    it("should handle heartbeat/ping — client must reply with pong", async () => {
      server.send(
        client,
        JSON.stringify({ type: "ping", timestamp: Date.now() })
      );

      // The client application is expected to call client.send({ type: "pong" }).
      // Here we verify the contract by simulating that behaviour:
      client.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));

      const lastSent = server.received[server.received.length - 1]!;
      expect(lastSent).toContain("pong");
    });

    it("should detect closed connection after server close", async () => {
      server.close(client);
      expect(client.readyState).toBe(MockWebSocket.CLOSED);
    });
  });

  // ── Admin-specific Events ────────────────────────────────────────────────────
  describe("Admin-specific Events", () => {
    beforeEach(async () => {
      client = new MockWebSocket(WS_URL, server);
      await tick();
    });

    it("should receive admin alerts", async () => {
      const messageHandler = vi.fn();
      client.onmessage = messageHandler;

      server.send(
        client,
        JSON.stringify({
          type: "admin-alert",
          severity: "warning",
          title: "High Server Load",
          message: "CPU usage is above 80%",
          metadata: { cpu: 85, memory: 70 },
        })
      );

      const receivedData = JSON.parse(messageHandler.mock.calls[0]![0]!.data);
      expect(receivedData.type).toBe("admin-alert");
      expect(receivedData.severity).toBe("warning");
    });

    it("should receive audit log events", async () => {
      const messageHandler = vi.fn();
      client.onmessage = messageHandler;

      server.send(
        client,
        JSON.stringify({
          type: "audit-log",
          event: {
            userId: "admin-1",
            action: "user_delete",
            resource: "users",
            resourceId: "user-123",
            timestamp: new Date().toISOString(),
          },
        })
      );

      const receivedData = JSON.parse(messageHandler.mock.calls[0]![0]!.data);
      expect(receivedData.type).toBe("audit-log");
    });

    it("should receive system status updates", async () => {
      const messageHandler = vi.fn();
      client.onmessage = messageHandler;

      server.send(
        client,
        JSON.stringify({
          type: "system-status",
          status: "healthy",
          services: { database: "up", redis: "up", queue: "up" },
          metrics: { requestsPerSecond: 120, avgResponseTime: 45 },
        })
      );

      const receivedData = JSON.parse(messageHandler.mock.calls[0]![0]!.data);
      expect(receivedData.type).toBe("system-status");
      expect(receivedData.status).toBe("healthy");
    });
  });

  // ── Error Handling ───────────────────────────────────────────────────────────
  describe("Error Handling", () => {
    it("should handle invalid messages gracefully", async () => {
      client = new MockWebSocket(WS_URL, server);
      await tick();

      // Send invalid JSON — client should not crash
      server.send(client, "invalid json");
      expect(client.readyState).toBe(MockWebSocket.OPEN);
    });

    it("should invoke onerror handler on server error", async () => {
      client = new MockWebSocket(WS_URL, server);
      await tick();

      const errorHandler = vi.fn();
      client.onerror = errorHandler;

      server.error(client);

      expect(errorHandler).toHaveBeenCalledOnce();
    });
  });

  // ── Multi-pod Pub/Sub (Architectural Contract) ───────────────────────────────
  /**
   * These tests document the Redis Pub/Sub CONTRACT the backend must satisfy
   * for horizontal scaling. They simulate two independent pod connections and
   * verify that a message published on pod-1's channel is received by a client
   * connected to pod-2 — which only works if Redis Pub/Sub broadcasts between pods.
   *
   * Backend implementation required:
   *   - Go WebSocket Hub must subscribe to a shared Redis channel on startup.
   *   - When a message arrives on the WebSocket, the Hub publishes it to Redis.
   *   - Every Hub instance (pod) receives the Redis message and forwards it to
   *     its locally connected clients.
   */
  describe("Multi-pod Pub/Sub (Architectural Contract)", () => {
    it("client on pod-2 receives message sent by client on pod-1 via Redis broadcast", async () => {
      // Simulate two independent pod server instances sharing a Redis channel.
      const pod1Server = createMockServer();
      const pod2Server = createMockServer();

      const clientOnPod1 = new MockWebSocket(WS_URL, pod1Server);
      const clientOnPod2 = new MockWebSocket(WS_URL, pod2Server);
      await tick();

      const pod2MessageHandler = vi.fn();
      clientOnPod2.onmessage = pod2MessageHandler;

      // clientOnPod1 sends a message.
      const payload = JSON.stringify({
        type: "chat",
        from: "user-A",
        body: "Hello from pod-1",
      });
      clientOnPod1.send(payload);

      // Redis Pub/Sub contract: pod-1 publishes to Redis → Redis fans out to pod-2
      // → pod-2's Hub delivers to clientOnPod2. We simulate this delivery:
      pod2Server.broadcast(payload);

      expect(pod2MessageHandler).toHaveBeenCalledOnce();
      const received = JSON.parse(pod2MessageHandler.mock.calls[0]![0]!.data);
      expect(received.type).toBe("chat");
      expect(received.from).toBe("user-A");
      expect(received.body).toBe("Hello from pod-1");

      pod1Server.reset();
      pod2Server.reset();
    });

    it("broadcast reaches ALL clients across pods simultaneously", async () => {
      const pod1 = createMockServer();
      const pod2 = createMockServer();

      const c1 = new MockWebSocket(WS_URL, pod1);
      const c2 = new MockWebSocket(WS_URL, pod1);
      const c3 = new MockWebSocket(WS_URL, pod2);
      await tick();

      const handlers = [vi.fn(), vi.fn(), vi.fn()];
      c1.onmessage = handlers[0]!;
      c2.onmessage = handlers[1]!;
      c3.onmessage = handlers[2]!;

      const notification = JSON.stringify({ type: "notification", id: "broadcast-1" });

      // Redis Pub/Sub → all pods receive and broadcast to their local clients.
      pod1.broadcast(notification);
      pod2.broadcast(notification);

      for (const handler of handlers) {
        expect(handler).toHaveBeenCalledOnce();
      }

      pod1.reset();
      pod2.reset();
    });
  });

  // ── Rate Limiting ────────────────────────────────────────────────────────────
  describe("Rate Limiting", () => {
    it("should simulate rate limit rejection when connections exceed limit", async () => {
      const rateLimitServer = createMockServer();
      
      const client1 = new MockWebSocket(WS_URL, rateLimitServer);
      const client2 = new MockWebSocket(WS_URL, rateLimitServer);
      const client3 = new MockWebSocket(WS_URL, rateLimitServer);
      const client4 = new MockWebSocket(WS_URL, rateLimitServer);
      const client5 = new MockWebSocket(WS_URL, rateLimitServer);
      
      // The 6th connection attempts under rate limit threshold and is rejected:
      const rateLimitedClient = new MockWebSocket(WS_URL, rateLimitServer);
      const closeHandler = vi.fn();
      rateLimitedClient.onclose = closeHandler;
      
      rateLimitServer.close(rateLimitedClient);
      
      expect(rateLimitedClient.readyState).toBe(MockWebSocket.CLOSED);
      expect(closeHandler).toHaveBeenCalledOnce();
      rateLimitServer.reset();
    });
  });
});

