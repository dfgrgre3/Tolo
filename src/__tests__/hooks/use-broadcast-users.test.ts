import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useBroadcastUsers } from "@/hooks/use-broadcast-users";
import * as adminApi from "@/lib/api/admin-api";

vi.mock("@/lib/api/admin-api", () => ({
  adminFetch: vi.fn(),
}));

describe("useBroadcastUsers", () => {
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

  const mockUsers = [
    { id: "1", name: "User 1", email: "user1@test.com", role: "STUDENT" },
    { id: "2", name: "User 2", email: "user2@test.com", role: "TEACHER" },
    { id: "3", name: "User 3", email: "user3@test.com", role: "ADMIN" },
  ];

  it("should fetch users on mount", async () => {
    vi.mocked(adminApi.adminFetch).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: { users: mockUsers },
        }),
    } as Response);

    const { result } = renderHook(() => useBroadcastUsers(), { wrapper });

    await vi.waitFor(() => {
      expect(result.current.users).toHaveLength(3);
    });

    expect(result.current.users[0].name).toBe("User 1");
  });

  it("should filter users by search query", async () => {
    vi.mocked(adminApi.adminFetch).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: { users: mockUsers },
        }),
    } as Response);

    const { result } = renderHook(() => useBroadcastUsers(), { wrapper });

    await vi.waitFor(() => {
      expect(result.current.users).toHaveLength(3);
    });

    act(() => {
      result.current.setSearch("User 1");
    });

    expect(result.current.filteredUsers).toHaveLength(1);
    expect(result.current.filteredUsers[0].name).toBe("User 1");
  });

  it("should filter users by role", async () => {
    vi.mocked(adminApi.adminFetch).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: { users: mockUsers },
        }),
    } as Response);

    const { result } = renderHook(() => useBroadcastUsers(), { wrapper });

    await vi.waitFor(() => {
      expect(result.current.users).toHaveLength(3);
    });

    act(() => {
      result.current.selectSegment("teachers");
    });

    expect(result.current.filteredUsers).toHaveLength(1);
    expect(result.current.filteredUsers[0].role).toBe("TEACHER");
  });

  it("should toggle user selection", async () => {
    vi.mocked(adminApi.adminFetch).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: { users: mockUsers },
        }),
    } as Response);

    const { result } = renderHook(() => useBroadcastUsers(), { wrapper });

    await vi.waitFor(() => {
      expect(result.current.users).toHaveLength(3);
    });

    act(() => {
      result.current.toggleUserSelection("1");
    });

    expect(result.current.selectedUserIds).toContain("1");

    act(() => {
      result.current.toggleUserSelection("1");
    });

    expect(result.current.selectedUserIds).not.toContain("1");
  });

  it("should select/deselect all users", async () => {
    vi.mocked(adminApi.adminFetch).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: { users: mockUsers },
        }),
    } as Response);

    const { result } = renderHook(() => useBroadcastUsers(), { wrapper });

    await vi.waitFor(() => {
      expect(result.current.users).toHaveLength(3);
    });

    act(() => {
      result.current.selectAll();
    });

    expect(result.current.selectedUserIds).toHaveLength(3);

    act(() => {
      result.current.deselectAll();
    });

    expect(result.current.selectedUserIds).toHaveLength(0);
  });

  it("should send broadcast message", async () => {
    vi.mocked(adminApi.adminFetch)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: { users: mockUsers },
          }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: { success: 2, failed: 0 },
          }),
      } as Response);

    const { result } = renderHook(() => useBroadcastUsers(), { wrapper });

    await vi.waitFor(() => {
      expect(result.current.users).toHaveLength(3);
    });

    act(() => {
      result.current.toggleUserSelection("1");
      result.current.toggleUserSelection("2");
    });

    await act(async () => {
      await result.current.sendBroadcast("Test message", "info");
    });

    expect(adminApi.adminFetch).toHaveBeenCalledWith(
      "/admin/broadcast",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Test message"),
      })
    );
  });

  it("should handle API errors gracefully", async () => {
    vi.mocked(adminApi.adminFetch).mockRejectedValueOnce(new Error("Failed to fetch"));

    const { result } = renderHook(() => useBroadcastUsers(), { wrapper });

    await vi.waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });
});
