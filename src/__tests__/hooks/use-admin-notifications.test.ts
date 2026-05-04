import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useAdminNotifications } from "@/hooks/use-admin-notifications";
import * as adminApi from "@/lib/api/admin-api";

// Mock the admin API
vi.mock("@/lib/api/admin-api", () => ({
  adminFetch: vi.fn(),
}));

// Mock WebSocket
class MockWebSocket {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  send = vi.fn();
  close = vi.fn();
}

const mockWebSocket = new MockWebSocket();
vi.stubGlobal("WebSocket", vi.fn(() => mockWebSocket));

describe("useAdminNotifications", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    QueryClientProvider({ client: queryClient, children })
  );

  it("should fetch notifications on mount", async () => {
    const mockNotifications = [
      { id: "1", message: "Test notification", read: false, createdAt: new Date().toISOString() },
    ];

    vi.mocked(adminApi.adminFetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: {
          notifications: mockNotifications,
          unreadCount: 1,
        },
      }),
    } as Response);

    const { result } = renderHook(() => useAdminNotifications(), { wrapper });

    await vi.waitFor(() => {
      expect(result.current.notifications).toHaveLength(1);
    });

    expect(result.current.unreadCount).toBe(1);
    expect(result.current.notifications[0].description).toBe("Test notification");
  });

  it("should handle WebSocket messages", async () => {
    vi.mocked(adminApi.adminFetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: { notifications: [], unreadCount: 0 },
      }),
    } as Response);

    const { result } = renderHook(() => useAdminNotifications(), { wrapper });

    await vi.waitFor(() => {
      expect(result.current.notifications).toHaveLength(0);
    });

    // Simulate WebSocket message
    act(() => {
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage(
          new MessageEvent("message", {
            data: JSON.stringify({
              type: "notification",
              notification: { id: "2", message: "New notification", read: false },
            }),
          })
        );
      }
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].description).toBe("New notification");
  });

  it("should mark notification as read", async () => {
    const mockNotifications = [
      { id: "1", message: "Test", read: false, createdAt: new Date().toISOString() },
    ];

    vi.mocked(adminApi.adminFetch)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: { notifications: mockNotifications, unreadCount: 1 },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response);

    const { result } = renderHook(() => useAdminNotifications(), { wrapper });

    await vi.waitFor(() => {
      expect(result.current.notifications).toHaveLength(1);
    });

    await act(async () => {
      await result.current.markAsRead("1");
    });

    expect(adminApi.adminFetch).toHaveBeenCalledWith(
      "/admin/notifications/1/read",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("should handle error states", async () => {
    vi.mocked(adminApi.adminFetch).mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useAdminNotifications(), { wrapper });

    await vi.waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });

  it("should refetch notifications", async () => {
    vi.mocked(adminApi.adminFetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: { notifications: [], unreadCount: 0 },
      }),
    } as Response);

    const { result } = renderHook(() => useAdminNotifications(), { wrapper });

    await act(async () => {
      await result.current.refetch();
    });

    expect(adminApi.adminFetch).toHaveBeenCalledTimes(2);
  });
});
