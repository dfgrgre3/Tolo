// TypeScript interfaces and types for settings configuration
// Ensures type safety when accessing settings properties

// Enums from the database schema
import { SubjectType, ExamType, FocusStrategy } from './enums';
import { DateString } from './api/common';

export { SubjectType, ExamType, FocusStrategy };

// Subject enrollment interface
export interface SubjectEnrollment {
  /** The subject identifier */
  subject: SubjectType;
  /** Target hours to study per week */
  targetWeeklyHours: number;
}

// User settings interface
export interface UserSettings {
  id: string;
  /** Preferred wake up time (HH:mm) */
  wakeUpTime?: string | null;
  /** Preferred sleep time (HH:mm) */
  sleepTime?: string | null;
  /** Strategy used for focus sessions */
  focusStrategy?: FocusStrategy | null;
  twoFactorEnabled?: boolean;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
}

// Complete settings data interface
export interface SettingsData {
  user: UserSettings | null;
  subjects: SubjectEnrollment[];
}

// API response interface for settings
export interface SettingsApiResponse {
  user: UserSettings | null;
  subjects: SubjectEnrollment[];
}

// Request body interface for updating settings
export interface SettingsUpdateRequest {
  userId: string;
  wakeUpTime?: string | null;
  sleepTime?: string | null;
  focusStrategy?: FocusStrategy | null;
  subjects?: {
    subject: SubjectType;
    targetWeeklyHours: number;
  }[];
}

// Notification settings interface
export interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  taskReminders: boolean;
  examReminders: boolean;
  progressReports: boolean;
}

// Appearance settings interface
export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  language: 'ar' | 'en';
  fontSize: 'small' | 'medium' | 'large';
  primaryColor: 'blue' | 'green' | 'purple' | 'red';
  timezone: string;
  dateFormat: 'hijri' | 'gregorian';
}

// Security settings interface
export interface SecuritySettings {
  twoFactorEnabled: boolean;
  activeSessions: SessionInfo[];
}

// Session information interface
export interface SessionInfo {
  id: string;
  /** Human readable device information */
  deviceInfo: string;
  /** Last time the session was active */
  lastAccessed: DateString | Date;
  /** Whether this is the current session */
  isActive: boolean;
}

// Recommendation interface
export interface Recommendation {
  title: string;
  message: string;
}

// Complete application settings interface
export interface AppSettings extends UserSettings, Partial<NotificationSettings>, Partial<AppearanceSettings>, Partial<SecuritySettings> {
  subjects: SubjectEnrollment[];
  recommendations: Recommendation[];
}
