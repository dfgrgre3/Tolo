import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { CourseService, GetCourseRequestSchema, GetCoursesRequestSchema } from "@/data-access/grpc/course_pb";
import { AuthService } from "@/data-access/grpc/auth_pb";
import { AnalyticsService } from "@/data-access/grpc/analytics_pb";
import { cache } from "react";
import { trimTrailingSlashes } from "@/lib/utils";
import { toJson, isMessage } from "@bufbuild/protobuf";

const isBrowser = typeof window !== 'undefined';
const isProd = process.env.NODE_ENV === 'production';
const baseUrl = trimTrailingSlashes(
  isBrowser
    ? '/api'
    : (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8082/api")
);

const transport = createConnectTransport({
  baseUrl,
  useHttpGet: true,
  // Ensure Next.js fetch caching is enabled for gRPC GET requests
  fetch: async (input, init) => {
    const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : '';
    const isAuthRequest = urlStr.includes('AuthService') || urlStr.includes('/auth/');
    
    const newInit = { ...init };
    const headers = new Headers(newInit.headers);
    if (isBrowser) {
      if (!headers.has('Authorization')) {
        const clerk = (window as any).Clerk;
        if (clerk?.session) {
          try {
            const token = await clerk.session.getToken();
            if (token) {
              headers.set('Authorization', `Bearer ${token}`);
            }
          } catch (e) {
            console.error('Failed to get Clerk token for RPC request:', e);
          }
        }
      }

      // Extract and attach CSRF token if present in cookies
      const cookies = document.cookie.split(';').map(c => c.trim());
      const csrfNames = ['_csrf', 'X-CSRF-Token', 'csrf', 'csrf_token'];
      let csrfToken: string | undefined;
      for (const name of csrfNames) {
        const entry = cookies.find(c => c.startsWith(name + '='));
        if (entry) {
          try {
            csrfToken = decodeURIComponent(entry.split('=')[1]);
          } catch {
            csrfToken = entry.split('=')[1];
          }
          break;
        }
      }
      if (csrfToken) {
        headers.set('X-CSRF-Token', csrfToken);
      }
    } else {
      if (!headers.has('Authorization')) {
        try {
          const { auth } = await import("@clerk/nextjs/server");
          const { getToken } = await auth();
          const token = await getToken();
          if (token) {
            headers.set('Authorization', `Bearer ${token}`);
          }
        } catch (e) {
          // Ignore safely during static generation/pre-rendering where request context is absent
          console.warn('Could not retrieve Clerk token for server RPC request:', e);
        }
      }
    }
    newInit.headers = headers;

    if (isAuthRequest) {
      return fetch(input, {
        ...newInit,
        cache: 'no-store'
      });
    }

    return fetch(input, {
      ...newInit,
      next: { revalidate: 60 } // Cache for 60 seconds
    });
  }
});

export const courseClient = createClient(CourseService, transport);
export const authClient = createClient(AuthService, transport);
export const analyticsClient = createClient(AnalyticsService, transport);

// Helper for caching server-side gRPC requests across different users (SSR Cache Stampede fix)
let serverCacheWrapper = <T extends (...args: any[]) => Promise<unknown>>(
  fn: T,
  method: string,
  schema?: any
): T => fn;

if (!isBrowser) {
  try {
    const { unstable_cache } = require('next/cache');
    serverCacheWrapper = ((fn: (...args: any[]) => Promise<unknown>, method: string, schema?: any) => 
      async (...args: any[]) => {
        // Create a stable cache key based on the method and properly serialized arguments
        const serializedArgs = args.map(arg => {
          if (schema && isMessage(arg)) {
            try {
              return toJson(schema, arg);
            } catch (e) {
              return arg;
            }
          }
          return arg;
        });
        const cacheKey = [method, JSON.stringify(serializedArgs)];
        
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
  'getCourse',
  GetCourseRequestSchema
));

export const cachedGetCourses = cache(serverCacheWrapper(
  async (req: Parameters<typeof courseClient.getCourses>[0]) => await courseClient.getCourses(req!),
  'getCourses',
  GetCoursesRequestSchema
));

// Legacy export for backward compatibility if needed
export const rpcClient = {
  ...courseClient,
  getCourse: isBrowser ? courseClient.getCourse : cachedGetCourse,
  getCourses: isBrowser ? courseClient.getCourses : cachedGetCourses,
};
