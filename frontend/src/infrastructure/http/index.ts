/**
 * Infrastructure Layer — HTTP Transport
 *
 * الواجهة العامة لطبقة النقل HTTP.
 * يعيد تصدير apiClient وHttpTransport من مواقعها الحالية.
 *
 * @canonical هذا هو المسار الصحيح الجديد: `@/infrastructure/http`
 * @legacy الاستخدام القديم `@/lib/api/api-client` لا يزال يعمل
 */

export { default as apiClient } from "@/lib/api/api-client";
export { ApiError } from "@/lib/api/api-client";
export {
  BrowserTransport,
  ServerTransport,
  createHttpTransport,
  defaultHttpTransport,
} from "@/lib/api/http-transport";
export type { HttpTransport } from "@/lib/api/http-transport";
export { apiRoutes } from "@/lib/api/routes";
export { queryProfiles } from "@/lib/query/query-profiles";
export type { QueryProfileOptions, QueryProfileName } from "@/lib/query/query-profiles";
