import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { CourseService } from "@/gen/thanawy/v1/course_pb";
import { AuthService } from "@/gen/thanawy/v1/auth_pb";
import { AnalyticsService } from "@/gen/thanawy/v1/analytics_pb";
import { cache } from "react";
import { trimTrailingSlashes } from "./utils";

const isBrowser = typeof window !== 'undefined';
const baseUrl = trimTrailingSlashes(isBrowser ? '/api' : (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8082/api"));

const transport = createConnectTransport({
  baseUrl,
  // Ensure Next.js fetch caching is enabled for gRPC POST requests
  fetch: (input, init) => {
    return fetch(input, {
      ...init,
      next: { revalidate: 60 } // Cache for 60 seconds
    });
  }
});

export const courseClient = createClient(CourseService, transport);
export const authClient = createClient(AuthService, transport);
export const analyticsClient = createClient(AnalyticsService, transport);

// Helper for caching server-side gRPC requests across different users (SSR Cache Stampede fix)
let serverCacheWrapper = <T extends (...args: any[]) => Promise<unknown>>(fn: T, method: string): T => fn;
if (!isBrowser) {
  try {
    const { unstable_cache } = require('next/cache');
    serverCacheWrapper = ((fn: (...args: any[]) => Promise<unknown>, method: string) => 
      async (...args: any[]) => {
        // Create a stable cache key based on the method and serialized arguments
        const cacheKey = [method, JSON.stringify(args)];
        
        return await unstable_cache(
          async () => {
            return await fn(...args);
          },
          cacheKey,
          { 
            revalidate: 60,
            tags: ['grpc', method]
          }
        )();
      }) as typeof serverCacheWrapper;
  } catch (e) {
    // Ignore if unstable_cache is not available
  }
}

// Implement SSR request deduplication using React cache and Next.js unstable_cache
export const cachedGetCourse = cache(serverCacheWrapper(
  async (req: Parameters<typeof courseClient.getCourse>[0]) => await courseClient.getCourse(req!),
  'getCourse'
));

export const cachedGetCourses = cache(serverCacheWrapper(
  async (req: Parameters<typeof courseClient.getCourses>[0]) => await courseClient.getCourses(req!),
  'getCourses'
));

// Legacy export for backward compatibility if needed
export const rpcClient = {
  ...courseClient,
  getCourse: isBrowser ? courseClient.getCourse : cachedGetCourse,
  getCourses: isBrowser ? courseClient.getCourses : cachedGetCourses,
};
