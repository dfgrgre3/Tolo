import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { CourseService } from "@/gen/thanawy/v1/course_pb";
import { AuthService } from "@/gen/thanawy/v1/auth_pb";
import { AnalyticsService } from "@/gen/thanawy/v1/analytics_pb";

const transport = createConnectTransport({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api",
});

export const courseClient = createClient(CourseService, transport);
export const authClient = createClient(AuthService, transport);
export const analyticsClient = createClient(AnalyticsService, transport);

// Legacy export for backward compatibility if needed
export const rpcClient = courseClient;

