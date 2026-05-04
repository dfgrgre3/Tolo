import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "http";
import { parse } from "url";

const API_BASE = "http://localhost:8082/api";

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
