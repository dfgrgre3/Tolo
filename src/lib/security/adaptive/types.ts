/**
 * 🛡️ Adaptive Authentication Types
 * 
 * أنواع المصادقة التكيفية
 */

// مستويات المخاطر
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

// أنواع التحقق الإضافي
export type StepUpMethod =
    | 'email_otp'      // رمز عبر البريد
    | 'sms_otp'        // رمز عبر SMS
    | 'whatsapp_otp'   // رمز عبر واتساب
    | 'passkey_reauth' // إعادة التحقق بالـ Passkey
    | 'totp'           // تطبيق المصادقة
    | 'security_questions' // أسئلة الأمان
    | 'manual_review'; // مراجعة يدوية

// حالة التحقق الإضافي
export type StepUpStatus =
    | 'pending'    // في الانتظار
    | 'sent'       // تم الإرسال
    | 'verified'   // تم التحقق
    | 'failed'     // فشل
    | 'expired';   // انتهت الصلاحية

// إشارات المخاطر الجغرافية
export interface GeoRiskSignals {
    isNewCountry: boolean;
    isNewCity: boolean;
    isImpossibleTravel: boolean;
    distanceFromLastLogin?: number; // بالكيلومترات
    travelTimeRequired?: number;    // بالساعات
    actualTimeDiff?: number;        // بالساعات
}

// إشارات مخاطر الجهاز
export interface DeviceRiskSignals {
    isNewDevice: boolean;
    fingerprintChanged: boolean;
    isEmulator: boolean;
    isRooted: boolean;
    browserChanged: boolean;
    osChanged: boolean;
    isTrustedDevice: boolean;
}

// إشارات مخاطر التوقيت
export interface TimingRiskSignals {
    isUnusualTime: boolean;
    rapidAttempts: boolean;
    attemptCount: number;
    timeSinceLastAttempt?: number; // بالثواني
    isOutsideNormalHours: boolean;
}

// إشارات مخاطر الشبكة
export interface NetworkRiskSignals {
    isTorOrVPN: boolean;
    isDataCenter: boolean;
    isKnownBot: boolean;
    isKnownMaliciousIP: boolean;
    isProxy: boolean;
    asnRisk: 'low' | 'medium' | 'high';
}

// إشارات سلوكية
export interface BehavioralRiskSignals {
    typingPatternAnomaly: boolean;
    mousePatternAnomaly: boolean;
    navigationAnomaly: boolean;
    sessionAnomaly: boolean;
}

// جميع إشارات المخاطر
export interface RiskSignals {
    geo: GeoRiskSignals;
    device: DeviceRiskSignals;
    timing: TimingRiskSignals;
    network: NetworkRiskSignals;
    behavioral: BehavioralRiskSignals;
}

// نتيجة تقييم المخاطر
export interface RiskAssessment {
    score: number;           // 0-100
    level: RiskLevel;
    signals: RiskSignals;
    reasons: RiskReason[];
    action: RiskAction;
    stepUpMethods?: StepUpMethod[];
    sessionId: string;
    timestamp: Date;
}

// سبب المخاطر
export interface RiskReason {
    code: string;
    message: string;
    messageAr: string;
    weight: number;
    category: 'geo' | 'device' | 'timing' | 'network' | 'behavioral';
}

// الإجراء المتخذ
export type RiskAction =
    | 'allow'     // السماح
    | 'step_up'   // تحقق إضافي
    | 'block'     // حظر
    | 'review';   // مراجعة

// طلب التحقق الإضافي
export interface StepUpRequest {
    sessionId: string;
    userId: string;
    method: StepUpMethod;
    reason: string;
    riskAssessment: RiskAssessment;
    expiresAt: Date;
    attempts: number;
    maxAttempts: number;
}

// استجابة التحقق الإضافي
export interface StepUpResponse {
    success: boolean;
    status: StepUpStatus;
    method: StepUpMethod;
    message?: string;
    remainingAttempts?: number;
    nextRetryAt?: Date;
}

// سياق تسجيل الدخول
export interface LoginContext {
    userId?: string;
    email?: string;
    ip: string;
    userAgent: string;
    fingerprint?: string;
    geo?: {
        country?: string;
        countryCode?: string;
        city?: string;
        region?: string;
        lat?: number;
        lng?: number;
        timezone?: string;
    };
    device?: {
        type: 'mobile' | 'tablet' | 'desktop' | 'unknown';
        browser?: string;
        browserVersion?: string;
        os?: string;
        osVersion?: string;
    };
    timestamp: Date;
    sessionId?: string;
}

// سجل تسجيل دخول سابق
export interface LoginHistory {
    userId: string;
    ip: string;
    geo?: LoginContext['geo'];
    device?: LoginContext['device'];
    timestamp: Date;
    success: boolean;
    riskScore?: number;
}

// تكوين المصادقة التكيفية
export interface AdaptiveAuthConfig {
    enabled: boolean;

    // عتبات المخاطر
    thresholds: {
        low: number;      // 0-29
        medium: number;   // 30-49
        high: number;     // 50-79
        critical: number; // 80-100
    };

    // أوزان الإشارات
    weights: {
        newCountry: number;
        impossibleTravel: number;
        newDevice: number;
        fingerprintMismatch: number;
        emulator: number;
        unusualTime: number;
        rapidAttempts: number;
        torVPN: number;
        dataCenter: number;
        knownBot: number;
        behavioralAnomaly: number;
    };

    // طرق التحقق المتاحة
    availableMethods: StepUpMethod[];

    // الإعدادات
    settings: {
        stepUpTimeout: number;        // بالثواني
        maxStepUpAttempts: number;
        blockDuration: number;        // بالدقائق
        rememberDeviceDays: number;
    };
}

// Default Configuration
export const DEFAULT_ADAPTIVE_AUTH_CONFIG: AdaptiveAuthConfig = {
    enabled: true,

    thresholds: {
        low: 30,
        medium: 50,
        high: 80,
        critical: 100,
    },

    weights: {
        newCountry: 40,
        impossibleTravel: 80,
        newDevice: 30,
        fingerprintMismatch: 50,
        emulator: 60,
        unusualTime: 15,
        rapidAttempts: 35,
        torVPN: 45,
        dataCenter: 25,
        knownBot: 90,
        behavioralAnomaly: 25,
    },

    availableMethods: ['email_otp', 'totp', 'passkey_reauth'],

    settings: {
        stepUpTimeout: 300,        // 5 minutes
        maxStepUpAttempts: 3,
        blockDuration: 30,         // 30 minutes
        rememberDeviceDays: 30,
    },
};
