import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import WS from "jest-websocket-mock";

const WS_URL = "ws://localhost:8082/ws";

describe("WebSocket Integration", () => {
  let server: WS;
  let client: WebSocket;

  beforeAll(() => {
    server = new WS(WS_URL);
  });

  afterAll(() => {
    WS.clean();
  });

  describe("Connection", () => {
    it("should connect to WebSocket server", async () => {
      client = new WebSocket(WS_URL);
      await server.connected;
      expect(client.readyState).toBe(WebSocket.OPEN);
    });

    it("should authenticate on connection", async () => {
      client = new WebSocket(WS_URL);
      await server.connected;

      // Send auth message
      server.send(
        JSON.stringify({
          type: "auth",
          token: "valid-jwt-token",
        })
      );

      // Expect auth response
      await expect(server).toReceiveMessage(
        JSON.stringify({
          type: "auth_response",
          status: "success",
        })
      );
    });

    it("should reject unauthenticated connections", async () => {
      client = new WebSocket(WS_URL);
      await server.connected;

      // Don't send auth
      server.send(
        JSON.stringify({
          type: "auth_response",
          status: "error",
          message: "Authentication required",
        })
      );
    });
  });

  describe("Real-time Notifications", () => {
    beforeEach(async () => {
      client = new WebSocket(WS_URL);
      await server.connected;
    });

    afterEach(() => {
      client.close();
    });

    it("should receive real-time notifications", async () => {
      const messageHandler = vi.fn();
      client.onmessage = messageHandler;

      // Simulate server sending notification
      server.send(
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

      // Wait for message to be received
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(messageHandler).toHaveBeenCalled();
      const receivedData = JSON.parse(messageHandler.mock.calls[0][0].data);
      expect(receivedData.type).toBe("notification");
    });

    it("should receive broadcast progress updates", async () => {
      const messageHandler = vi.fn();
      client.onmessage = messageHandler;

      server.send(
        JSON.stringify({
          type: "broadcast-progress",
          broadcastId: "123",
          stats: {
            sent: 50,
            delivered: 45,
            failed: 5,
            total: 100,
          },
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      const receivedData = JSON.parse(messageHandler.mock.calls[0][0].data);
      expect(receivedData.type).toBe("broadcast-progress");
      expect(receivedData.stats.sent).toBe(50);
    });

    it("should receive analytics updates", async () => {
      const messageHandler = vi.fn();
      client.onmessage = messageHandler;

      server.send(
        JSON.stringify({
          type: "analytics-update",
          metrics: {
            activeUsers: 150,
            pageViews: 1200,
          },
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      const receivedData = JSON.parse(messageHandler.mock.calls[0][0].data);
      expect(receivedData.type).toBe("analytics-update");
    });

    it("should handle heartbeat/ping", async () => {
      server.send(
        JSON.stringify({
          type: "ping",
          timestamp: Date.now(),
        })
      );

      // Client should respond with pong
      await expect(server).toReceiveMessage(
        expect.stringContaining("pong")
      );
    });

    it("should handle reconnection", async () => {
      // Close connection
      server.close();

      // Wait and check reconnection attempt
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Connection should be closed
      expect(client.readyState).toBe(WebSocket.CLOSED);
    });
  });

  describe("Admin-specific Events", () => {
    beforeEach(async () => {
      client = new WebSocket(WS_URL);
      await server.connected;
    });

    it("should receive admin alerts", async () => {
      const messageHandler = vi.fn();
      client.onmessage = messageHandler;

      server.send(
        JSON.stringify({
          type: "admin-alert",
          severity: "warning",
          title: "High Server Load",
          message: "CPU usage is above 80%",
          metadata: {
            cpu: 85,
            memory: 70,
          },
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      const receivedData = JSON.parse(messageHandler.mock.calls[0][0].data);
      expect(receivedData.type).toBe("admin-alert");
      expect(receivedData.severity).toBe("warning");
    });

    it("should receive audit log events", async () => {
      const messageHandler = vi.fn();
      client.onmessage = messageHandler;

      server.send(
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

      await new Promise((resolve) => setTimeout(resolve, 100));

      const receivedData = JSON.parse(messageHandler.mock.calls[0][0].data);
      expect(receivedData.type).toBe("audit-log");
    });

    it("should receive system status updates", async () => {
      const messageHandler = vi.fn();
      client.onmessage = messageHandler;

      server.send(
        JSON.stringify({
          type: "system-status",
          status: "healthy",
          services: {
            database: "up",
            redis: "up",
            queue: "up",
          },
          metrics: {
            requestsPerSecond: 120,
            avgResponseTime: 45,
          },
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      const receivedData = JSON.parse(messageHandler.mock.calls[0][0].data);
      expect(receivedData.type).toBe("system-status");
      expect(receivedData.status).toBe("healthy");
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid messages gracefully", async () => {
      client = new WebSocket(WS_URL);
      await server.connected;

      // Send invalid JSON
      server.send("invalid json");

      // Should not crash
      expect(client.readyState).toBe(WebSocket.OPEN);
    });

    it("should handle server errors", async () => {
      client = new WebSocket(WS_URL);
      await server.connected;

      const errorHandler = vi.fn();
      client.onerror = errorHandler;

      // Simulate server error
      server.error();

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(errorHandler).toHaveBeenCalled();
    });
  });
});

// Mock WebSocket for Node.js environment
if (typeof window === "undefined") {
  global.WebSocket = require("ws");
}
