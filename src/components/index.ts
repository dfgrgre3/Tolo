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
export { default as Dashboard } from './Dashboard';

// ============================================
// مكونات المهام والوقت (Tasks & Time)
// ============================================
export { default as TodoItem } from './TodoItem';
export { default as TimeTracker } from './TimeTracker';
export { default as CalendarScheduler } from './CalendarScheduler';

// ============================================
// مكونات معالجة الأخطاء (Error Handling)
// ============================================
export { default as ErrorBoundary } from './ErrorBoundary';
export { default as ErrorPages } from './ErrorPages';
export { default as ErrorToast } from './ErrorToast';
export { default as ErrorToastContainer } from './ErrorToastContainer';

// ============================================
// مكونات الإشعارات (Notifications)
// ============================================
export { default as NotificationsClient } from './NotificationsClient';
export { NotificationsProvider } from './NotificationsProvider';

// ============================================
// مكونات المزودين (Providers)
// ============================================
export { CombinedProviders } from './CombinedProviders';
export { ThemeProvider } from './theme-provider';

// ============================================
// مكونات WebSocket
// ============================================
export { default as WebSocketIndicator } from './WebSocketIndicator';

// ============================================
// مكونات التحليلات (Analytics)
// ============================================
export { 
  DailyProgressChart, 
  StatusMessage 
} from './analytics';
export type { 
  DailyProgressChartProps, 
  ChartDataPoint, 
  ThemeColors,
  StatusMessageProps 
} from './analytics';

// ============================================
// مكونات الذكاء الاصطناعي (AI)
// ============================================
export { default as AIAssistant } from './ai/AIAssistant';
export { default as AIAssistantEnhanced } from './ai/AIAssistantEnhanced';
export { default as ExamGenerator } from './ai/ExamGenerator';
export { default as TeacherSearch } from './ai/TeacherSearch';
export { default as TipsGenerator } from './ai/TipsGenerator';

// ============================================
// مكونات المصادقة (Authentication)
// ============================================
export { AuthGuard } from './auth/AuthGuard';
export { AuthSessionWrapper } from './auth/AuthSessionWrapper';
export { default as BiometricManagement } from './auth/BiometricManagement';
export { CaptchaWidget } from './auth/CaptchaWidget';
export { default as ChangePassword } from './auth/ChangePassword';
export { default as EnhancedLoginForm } from './auth/EnhancedLoginForm';
export { default as EnhancedRegisterForm } from './auth/EnhancedRegisterForm';
export { default as RecoveryCodesDisplay } from './auth/RecoveryCodesDisplay';
export { default as SecurityLog } from './auth/SecurityLog';
export { default as SecurityOnboarding } from './auth/SecurityOnboarding';
export { default as SessionManager } from './auth/SessionManager';
export { default as TOTPSetup } from './auth/TOTPSetup';
export { default as TwoFactorSettings } from './auth/TwoFactorSettings';
export { UnifiedAuthProvider } from './auth/UnifiedAuthProvider';

