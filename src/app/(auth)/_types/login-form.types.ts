/**
 * Login form types - Re-exports from core.types.ts
 */
export type {
    LoginFormData,
    LoginResponse,
    FieldErrors,
    DeviceFingerprint,
    RiskAssessment,
    ApiError as LoginErrorResponse,
} from './core.types';

// Standalone RiskLevel type
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
