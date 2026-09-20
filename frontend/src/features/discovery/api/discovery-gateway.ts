/**
 * Discovery API Gateway
 *
 * المالك الوحيد لاستدعاءات الاكتشاف: البحث العام، اشتراك النشرة،
 * وتتبع تفاعلات القائمة (beacon fallback).
 * يستخدم apiClient كـ transport خالص ولا يحمل منطق UI.
 *
 * Raw 1:1 mirrors (حد ترحيل الواجهات F-018): نفس المسار والطريقة
 * والحمولة التي استخدمتها الواجهة — صفر تغيير سلوكي بالتصميم.
 */

import { apiClient } from "@/lib/api/api-client";

type RequestOptions = { timeout?: number; retries?: number };

export function searchDirectoryRaw<T>(queryString: string): Promise<T> {
  return apiClient.get<T>(`/search${queryString}`);
}

export function subscribeNewsletterRaw(email: string): Promise<unknown> {
  return apiClient.post("/newsletter/subscribe", { email });
}

export function trackMegaMenuRaw(payload: object, options?: RequestOptions): Promise<unknown> {
  return apiClient.postJson<unknown>("/analytics/mega-menu", payload, options);
}
