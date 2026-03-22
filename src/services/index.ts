/**
 * Barrel exports for all services
 * نقطة تصدير موحدة لجميع الخدمات
 */

// Core Services
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

export { emailService } from './email-service';
export { firestoreService } from './firestore-service';
export { AuthService } from './auth/auth-service';
export { 
    sendEmailNotification, 
    sendSMSNotification, 
    sendMultiChannelNotification,
    type MultiChannelNotificationOptions,
    type MultiChannelNotificationResult
} from './notification-sender';
export { notificationService } from './notification-service';
export { rateLimitingService } from './rate-limiting-service';
export { smsService } from './sms-service';


// Re-export cache from unified location
export {
    CacheService,
    EducationalCache,
    InvalidationService,
    default as cacheService,
} from '@/lib/cache';

// Error Services
export { default as ErrorLogger } from './ErrorLogger';
export { default as ErrorManager } from './ErrorManager';

