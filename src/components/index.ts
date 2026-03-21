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
export { default as Header } from './Header';
export { default as Footer } from './Footer';
export * as Dashboard from './dashboard';

// ============================================
// مكونات المهام والوقت (Tasks & Time)
// ============================================

// TimeTracker moved to app/(dashboard)/time/components
// CalendarScheduler removed

// ============================================
// مكونات معالجة الأخطاء (Error Handling)
// ============================================
export { default as ErrorBoundary, useErrorBoundary, withErrorBoundary } from './ErrorBoundary';
export { default as ErrorPages } from './ErrorPages';

// ============================================
// مكونات الإشعارات (Notifications)
// ============================================
export { default as NotificationsClient } from './NotificationsClient';
export { NotificationsProvider } from '@/providers/NotificationsProvider';

// ============================================
// مكونات المزودين (Providers)
// ============================================
export { CombinedProviders } from '@/providers/CombinedProviders';
export { ThemeProvider } from '@/providers/ThemeProvider';

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

