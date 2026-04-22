/**
 * ملف التصدير المركزي لجميع المكونات
 * 
 * يسهل استيراد المكونات من مكان واحد
 * 
 * @example
 * ```tsx
 * import { Dashboard, Header, Footer } from '@/components';
 * ```
 */

// ============================================
// مكونات التخطيط (Layout Components)
// ============================================
export { default as Header } from './header';
export { default as Footer } from './footer';
export * as Dashboard from './dashboard';

// ============================================
// مكونات المهام والوقت (Tasks & Time)
// ============================================

// TimeTracker moved to app/(dashboard)/time/components
// CalendarScheduler removed

// ============================================
// مكونات معالجة الأخطاء (Error Handling)
// ============================================
export { default as ErrorBoundary, useErrorBoundary, withErrorBoundary } from './error-boundary';
export { default as ErrorPages } from './error-pages';

// ============================================
// مكونات الإشعارات (Notifications)
// ============================================
export { default as NotificationsClient } from './notifications-client';
export { NotificationsProvider } from '@/providers/notifications-provider';

// ============================================
// مكونات المزودين (Providers)
// ============================================
// CombinedProviders removed - use GlobalProviders from @/providers instead
export { ThemeProvider } from '@/providers/theme-provider';

// ============================================
// مكونات WebSocket
// ============================================
// WebSocketIndicator removed

// ============================================
// مكونات التحليلات (Analytics)
// ============================================
export { DailyProgressChart } from '@/app/(dashboard)/analytics/components/DailyProgressChart';
export { default as StatusMessage } from '@/app/(dashboard)/analytics/components/StatusMessage';
export type { DailyProgressChartProps, ChartDataPoint, ThemeColors } from '@/app/(dashboard)/analytics/components/DailyProgressChart';
export type { StatusMessageProps } from '@/app/(dashboard)/analytics/components/StatusMessage';

// ============================================
// مكونات الذكاء الاصطناعي (AI)
// ============================================
// AI components moved to app/(dashboard)/ai/components

// ============================================
// مكونات المصادقة (Authentication)
// ============================================
// Auth components moved to app/(auth)/components

