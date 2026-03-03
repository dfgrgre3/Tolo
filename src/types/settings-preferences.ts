export interface NotificationSettingsPreference {
  taskReminders: boolean;
  taskReminderTime: string;
  studyReminders: boolean;
  dailyGoalReminders: boolean;
  examReminders: boolean;
  examReminderDays: number;
  deadlineReminders: boolean;
  progressReports: boolean;
  weeklyReport: boolean;
  achievementAlerts: boolean;
  commentNotifications: boolean;
  mentionNotifications: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export interface PrivacySettingsPreference {
  profileVisibility: 'public' | 'friends' | 'private';
  showOnlineStatus: boolean;
  showLastSeen: boolean;
  showProgress: boolean;
  showAchievements: boolean;
  allowMessages: 'everyone' | 'friends' | 'none';
  allowFriendRequests: boolean;
  dataCollection: boolean;
  personalization: boolean;
  analytics: boolean;
}

export interface LanguageSettingsPreference {
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  firstDayOfWeek: 'saturday' | 'sunday' | 'monday';
  calendar: 'gregorian' | 'hijri' | 'both';
  numberFormat: 'arabic' | 'english';
  currency: string;
}

export interface AppearanceSettingsPreference {
  theme: 'light' | 'dark' | 'system';
  primaryColor: string;
  accentColor: string;
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  fontFamily: string;
  reducedMotion: boolean;
  highContrast: boolean;
  compactMode: boolean;
  sidebarPosition: 'right' | 'left';
  borderRadius: 'none' | 'small' | 'medium' | 'large';
}

export interface SettingsPreferences {
  notifications: NotificationSettingsPreference;
  privacy: PrivacySettingsPreference;
  language: LanguageSettingsPreference;
  appearance: AppearanceSettingsPreference;
}

export interface SettingsPreferencesPatch {
  notifications?: Partial<NotificationSettingsPreference>;
  privacy?: Partial<PrivacySettingsPreference>;
  language?: Partial<LanguageSettingsPreference>;
  appearance?: Partial<AppearanceSettingsPreference>;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettingsPreference = {
  taskReminders: true,
  taskReminderTime: '30',
  studyReminders: true,
  dailyGoalReminders: true,
  examReminders: true,
  examReminderDays: 3,
  deadlineReminders: true,
  progressReports: true,
  weeklyReport: true,
  achievementAlerts: true,
  commentNotifications: true,
  mentionNotifications: true,
  pushEnabled: true,
  emailEnabled: true,
  smsEnabled: false,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  soundEnabled: true,
  vibrationEnabled: true,
};

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettingsPreference = {
  profileVisibility: 'friends',
  showOnlineStatus: true,
  showLastSeen: true,
  showProgress: true,
  showAchievements: true,
  allowMessages: 'friends',
  allowFriendRequests: true,
  dataCollection: true,
  personalization: true,
  analytics: false,
};

export const DEFAULT_LANGUAGE_SETTINGS: LanguageSettingsPreference = {
  language: 'ar',
  timezone: 'Africa/Cairo',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '12h',
  firstDayOfWeek: 'saturday',
  calendar: 'gregorian',
  numberFormat: 'arabic',
  currency: 'EGP',
};

export const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettingsPreference = {
  theme: 'dark',
  primaryColor: '#6366f1',
  accentColor: '#8b5cf6',
  fontSize: 'medium',
  fontFamily: 'system',
  reducedMotion: false,
  highContrast: false,
  compactMode: false,
  sidebarPosition: 'right',
  borderRadius: 'medium',
};
