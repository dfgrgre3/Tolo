// TypeScript interfaces and types for settings configuration
// Ensures type safety when accessing settings properties

// Enums from the database schema
export enum SubjectType {
  MATH = 'MATH',
  PHYSICS = 'PHYSICS',
  CHEMISTRY = 'CHEMISTRY',
  ARABIC = 'ARABIC',
  ENGLISH = 'ENGLISH'
}

export enum ExamType {
  FINAL = 'FINAL',
  MIDTERM = 'MIDTERM',
  QUIZ = 'QUIZ',
  PRACTICE = 'PRACTICE',
  OTHER = 'OTHER'
}

export enum FocusStrategy {
  POMODORO = 'POMODORO',
  EIGHTY_TWENTY = 'EIGHTY_TWENTY',
  DEEP_WORK = 'DEEP_WORK',
  TIME_BLOCKING = 'TIME_BLOCKING',
  NO_DISTRACTION = 'NO_DISTRACTION'
}

// Subject enrollment interface
export interface SubjectEnrollment {
  subject: SubjectType;
  targetWeeklyHours: number;
}

// User settings interface
export interface UserSettings {
  id: string;
  wakeUpTime?: string | null;
  sleepTime?: string | null;
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
  deviceInfo: string;
  lastAccessed: Date;
  isActive: boolean;
}

// Recommendation interface
export interface Recommendation {
  title: string;
  message: string;
}

// Complete application settings interface
export interface AppSettings extends UserSettings, NotificationSettings, AppearanceSettings, SecuritySettings {
  subjects: SubjectEnrollment[];
  recommendations: Recommendation[];
}
