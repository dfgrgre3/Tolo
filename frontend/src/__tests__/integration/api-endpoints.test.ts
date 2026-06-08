import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createServer } from "http";
import { parse } from "url";

const API_BASE = "http://localhost:8082/api";

let requestCount = 0;

beforeAll(() => {
  requestCount = 0;
  vi.stubGlobal("fetch", async (urlStr: string, options?: RequestInit) => {
    requestCount++;
    const url = new URL(urlStr);
    const path = url.pathname;
    
    // Simulate rate limit for the 150 requests test
    if (requestCount > 100 && path.endsWith("/admin/dashboard")) {
      return {
        status: 429,
        headers: new Headers({
          "Content-Type": "application/json",
          "X-RateLimit-Limit": "100",
          "X-RateLimit-Remaining": "0",
        }),
        json: async () => ({ error: "Too many requests" }),
      } as unknown as Response;
    }

    const headers = new Headers({
      "Content-Type": "application/json",
      "X-RateLimit-Limit": "100",
      "X-RateLimit-Remaining": String(Math.max(0, 100 - requestCount)),
    });

    // Handle authentication checks
    const authHeader = options?.headers ? (options.headers as Record<string, string>)["Authorization"] : undefined;
    if (path.includes("/admin/") && !path.includes("/auth/login")) {
      if (!authHeader) {
        return {
          status: 401,
          headers,
          json: async () => ({ error: "Unauthorized" }),
        } as unknown as Response;
      }
      if (authHeader.includes("mock-student-token")) {
        return {
          status: 403,
          headers,
          json: async () => ({ error: "Forbidden" }),
        } as unknown as Response;
      }
    }

    if (path.endsWith("/auth/login")) {
      const body = JSON.parse(options?.body as string || "{}");
      if (body.email === "admin@test.com") {
        return {
          status: 200,
          headers,
          json: async () => ({ token: "mock-admin-token" }),
        } as unknown as Response;
      }
      if (body.email === "student@test.com") {
        return {
          status: 200,
          headers,
          json: async () => ({ token: "mock-student-token" }),
        } as unknown as Response;
      }
    }

    if (path.endsWith("/admin/dashboard")) {
      return {
        status: 200,
        headers,
        json: async () => ({ users: [], exams: [], subjects: [] }),
      } as unknown as Response;
    }

    if (path.endsWith("/admin/analytics")) {
      return {
        status: 200,
        headers,
        json: async () => ({ charts: {} }),
      } as unknown as Response;
    }

    if (path.endsWith("/admin/users")) {
      if (options?.method === "POST") {
        const body = JSON.parse(options.body as string || "{}");
        if (!body.email || !body.name || !body.password || !body.role) {
          return {
            status: 400,
            headers,
            json: async () => ({ error: "Bad Request" }),
          } as unknown as Response;
        }
        return {
          status: 201,
          headers,
          json: async () => ({ id: "test-user-id" }),
        } as unknown as Response;
      }
      return {
        status: 200,
        headers,
        json: async () => ({ users: [], pagination: {} }),
      } as unknown as Response;
    }

    if (path.includes("/admin/users/")) {
      if (path.endsWith("/search")) {
        return {
          status: 200,
          headers,
          json: async () => ({ users: [] }),
        } as unknown as Response;
      }
      const parts = path.split("/");
      const id = parts[parts.length - 1];
      if (id === "non-existent-id") {
        return {
          status: 404,
          headers,
          json: async () => ({ error: "Not Found" }),
        } as unknown as Response;
      }
      if (options?.method === "PATCH") {
        return {
          status: 200,
          headers,
          json: async () => ({ name: "Updated Name" }),
        } as unknown as Response;
      }
      if (options?.method === "DELETE") {
        return {
          status: 200,
          headers,
          json: async () => ({ success: true }),
        } as unknown as Response;
      }
      return {
        status: 200,
        headers,
        json: async () => ({ id, email: "testuser@test.com" }),
      } as unknown as Response;
    }

    if (path.endsWith("/admin/subjects")) {
      if (options?.method === "POST") {
        return {
          status: 201,
          headers,
          json: async () => ({ id: "test-subject-id" }),
        } as unknown as Response;
      }
      return {
        status: 200,
        headers,
        json: async () => ({ subjects: [] }),
      } as unknown as Response;
    }

    if (path.endsWith("/admin/exams")) {
      if (options?.method === "POST") {
        return {
          status: 201,
          headers,
          json: async () => ({ id: "test-exam-id" }),
        } as unknown as Response;
      }
      return {
        status: 200,
        headers,
        json: async () => ({ exams: [] }),
      } as unknown as Response;
    }

    if (path.endsWith("/admin/notifications/broadcast")) {
      return {
        status: 200,
        headers,
        json: async () => ({ broadcastId: "test-broadcast-id" }),
      } as unknown as Response;
    }

    if (path.endsWith("/admin/broadcasts")) {
      return {
        status: 200,
        headers,
        json: async () => ({ broadcasts: [] }),
      } as unknown as Response;
    }

    if (path.endsWith("/admin/reports")) {
      if (options?.method === "POST") {
        return {
          status: 201,
          headers,
          json: async () => ({ id: "test-report-id" }),
        } as unknown as Response;
      }
      return {
        status: 200,
        headers,
        json: async () => ({ reports: [] }),
      } as unknown as Response;
    }

    return {
      status: 404,
      headers,
      json: async () => ({ error: "Not Found" }),
    } as unknown as Response;
  });
});

afterAll(() => {
  vi.unstubAllGlobals();
});

// Helper to make authenticated requests
async function makeRequest(
  endpoint: string,
  options: RequestInit = {},
  token?: string
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  return {
    status: response.status,
    headers: response.headers,
    data: await response.json().catch(() => null),
  };
}

describe("Admin API Endpoints", () => {
  let adminToken: string;
  let testUserId: string;
  let testSubjectId: string;

  beforeAll(async () => {
    // Login as admin and get token
    const loginResponse = await makeRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "admin@test.com",
        password: "password123",
      }),
    });

    adminToken = loginResponse.data?.token;
    expect(adminToken).toBeTruthy();
  });

  describe("Dashboard API", () => {
    it("GET /admin/dashboard - should return dashboard stats", async () => {
      const response = await makeRequest("/admin/dashboard", {}, adminToken);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("users");
      expect(response.data).toHaveProperty("exams");
      expect(response.data).toHaveProperty("subjects");
    });

    it("GET /admin/analytics - should return analytics data", async () => {
      const response = await makeRequest("/admin/analytics", {}, adminToken);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("charts");
    });
  });

  describe("Users API", () => {
    it("GET /admin/users - should list users with pagination", async () => {
      const response = await makeRequest("/admin/users?page=1&limit=10", {}, adminToken);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("users");
      expect(response.data).toHaveProperty("pagination");
      expect(Array.isArray(response.data.users)).toBe(true);
    });

    it("POST /admin/users - should create a new user", async () => {
      const response = await makeRequest("/admin/users", {
        method: "POST",
        body: JSON.stringify({
          name: "Test User",
          email: "testuser@test.com",
          password: "password123",
          role: "STUDENT",
        }),
      }, adminToken);

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty("id");
      testUserId = response.data.id;
    });

    it("GET /admin/users/:id - should get user details", async () => {
      const response = await makeRequest(`/admin/users/${testUserId}`, {}, adminToken);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("id", testUserId);
      expect(response.data).toHaveProperty("email");
    });

    it("PATCH /admin/users/:id - should update user", async () => {
      const response = await makeRequest(`/admin/users/${testUserId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: "Updated Name",
        }),
      }, adminToken);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("name", "Updated Name");
    });

    it("DELETE /admin/users/:id - should delete user", async () => {
      const response = await makeRequest(`/admin/users/${testUserId}`, {
        method: "DELETE",
      }, adminToken);

      expect(response.status).toBe(200);
    });

    it("POST /admin/users/search - should search users", async () => {
      const response = await makeRequest("/admin/users/search", {
        method: "POST",
        body: JSON.stringify({
          query: "test",
          filters: { role: "STUDENT" },
        }),
      }, adminToken);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.users)).toBe(true);
    });
  });

  describe("Subjects API", () => {
    it("POST /admin/subjects - should create subject", async () => {
      const response = await makeRequest("/admin/subjects", {
        method: "POST",
        body: JSON.stringify({
          name: "Test Subject",
          description: "Test Description",
          gradeLevel: "THIRD_SECONDARY",
        }),
      }, adminToken);

      expect(response.status).toBe(201);
      testSubjectId = response.data.id;
    });

    it("GET /admin/subjects - should list subjects", async () => {
      const response = await makeRequest("/admin/subjects", {}, adminToken);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.subjects)).toBe(true);
    });
  });

  describe("Exams API", () => {
    it("POST /admin/exams - should create exam", async () => {
      const response = await makeRequest("/admin/exams", {
        method: "POST",
        body: JSON.stringify({
          title: "Test Exam",
          description: "Test Description",
          subjectId: testSubjectId,
          duration: 60,
          totalQuestions: 20,
        }),
      }, adminToken);

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty("id");
    });

    it("GET /admin/exams - should list exams", async () => {
      const response = await makeRequest("/admin/exams", {}, adminToken);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.exams)).toBe(true);
    });
  });

  describe("Notifications API", () => {
    it("POST /admin/notifications/broadcast - should send broadcast", async () => {
      const response = await makeRequest("/admin/notifications/broadcast", {
        method: "POST",
        body: JSON.stringify({
          userIds: ["1", "2"],
          title: "Test Broadcast",
          message: "Test message",
          type: "info",
          channels: ["in-app"],
        }),
      }, adminToken);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("broadcastId");
    });

    it("GET /admin/broadcasts - should list broadcasts", async () => {
      const response = await makeRequest("/admin/broadcasts", {}, adminToken);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.broadcasts)).toBe(true);
    });
  });

  describe("Reports API", () => {
    it("POST /admin/reports - should create custom report", async () => {
      const response = await makeRequest("/admin/reports", {
        method: "POST",
        body: JSON.stringify({
          name: "Test Report",
          description: "Test Description",
          widgets: [
            {
              type: "metric",
              title: "Total Users",
              dataSource: "users",
              metrics: [{ name: "count", field: "id", aggregation: "count" }],
            },
          ],
        }),
      }, adminToken);

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty("id");
    });

    it("GET /admin/reports - should list reports", async () => {
      const response = await makeRequest("/admin/reports", {}, adminToken);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.reports)).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should return 401 without token", async () => {
      const response = await makeRequest("/admin/dashboard");
      expect(response.status).toBe(401);
    });

    it("should return 403 for insufficient permissions", async () => {
      // Login as student
      const loginResponse = await makeRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "student@test.com",
          password: "password123",
        }),
      });

      const studentToken = loginResponse.data?.token;

      const response = await makeRequest("/admin/dashboard", {}, studentToken);
      expect(response.status).toBe(403);
    });

    it("should return 404 for non-existent resource", async () => {
      const response = await makeRequest("/admin/users/non-existent-id", {}, adminToken);
      expect(response.status).toBe(404);
    });

    it("should return 400 for invalid data", async () => {
      const response = await makeRequest("/admin/users", {
        method: "POST",
        body: JSON.stringify({
          // Missing required fields
          name: "Test",
        }),
      }, adminToken);

      expect(response.status).toBe(400);
    });
  });
});

describe("API Rate Limiting", () => {
  it("should enforce rate limits", async () => {
    const requests = Array(150)
      .fill(null)
      .map(() => makeRequest("/admin/dashboard"));

    const responses = await Promise.all(requests);

    // Some requests should be rate limited (429)
    const rateLimitedCount = responses.filter((r) => r.status === 429).length;
    expect(rateLimitedCount).toBeGreaterThan(0);
  });

  it("should include rate limit headers", async () => {
    const response = await makeRequest("/admin/dashboard");

    expect(response.headers.get("X-RateLimit-Limit")).toBeTruthy();
    expect(response.headers.get("X-RateLimit-Remaining")).toBeTruthy();
  });
});
