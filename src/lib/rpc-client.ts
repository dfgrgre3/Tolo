import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { CourseService } from "@/gen/thanawy/v1/course_pb";
import { AuthService } from "@/gen/thanawy/v1/auth_pb";
import { AnalyticsService } from "@/gen/thanawy/v1/analytics_pb";

const isBrowser = typeof window !== 'undefined';
const baseUrl = (isBrowser ? '/api' : (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8082/api")).replace(/\/+$/, '');

const transport = createConnectTransport({
  baseUrl,
});

export const courseClient = createClient(CourseService, transport);
export const authClient = createClient(AuthService, transport);
export const analyticsClient = createClient(AnalyticsService, transport);

// Legacy export for backward compatibility if needed
export const rpcClient = courseClient;

