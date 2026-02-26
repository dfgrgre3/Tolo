/**
 * Barrel exports for all services
 * نقطة تصدير موحدة لجميع الخدمات
 *
 * ✅ الاستخدام الصحيح:
 *   import { authService, gamificationService } from '@/lib/services'
 *
 * ⚠️ ملاحظات:
 * - authService: نظام المصادقة الموحد
 * - gamificationService: نظام النقاط والمكافآت الموحد
 * - cacheService: نظام التخزين المؤقت الموحد
 */

// Core Services
export {
    authService,
    AuthService,
    type AuthUser,
    type UserPayload,
    type TokenVerificationResult,
} from './auth-service';

export {
    gamificationService,
    GamificationService,
    type Achievement,
    type UserProgress,
    type Season,
    type Challenge,
    type QuestChain,
    type Quest,
    type Reward,
    type LeaderboardEntry as GamificationLeaderboardEntry,
} from './gamification-service';

// Re-export cache from unified location
export {
    CacheService,
    default as cacheService,
} from '../cache-service-unified';

// Specialized Logic (Keeping these for compatibility if they have unique logic)
export { TwoFactorChallengeService } from './auth-challenges-service';
export { RateLimitingService, rateLimitingService } from './rate-limiting-service';
export { emailService } from './email-service';
export { notificationService } from './notification-service';

// Deprecated / Legacy exports (Pointed to new unified services)
export { authService as LoginService } from './auth-service';
export { authService as RegisterService } from './auth-service';
export { authService as TokenService } from './auth-service';
export { authService as SecurityCheckService } from './auth-service';
export { authService as AuthCacheService } from './auth-service';
