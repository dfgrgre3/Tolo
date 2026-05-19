interface AppearanceSettingsPreference {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  reducedMotion: boolean;
  highContrast: boolean;
  compactMode?: boolean;
  efficiencyMode?: boolean;
}

interface LanguageSettingsPreference {
  language: string;
  numberFormat: 'arabic' | 'western';
  direction?: 'rtl' | 'ltr';
  timezone?: string;
}

export interface NotificationSettingsPreference {
  notificationsEnabled: boolean;
  studyReminders: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  // Additional fields
  taskReminders: boolean;
  taskReminderTime: string;
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
  showProgress: boolean;
  showLastSeen?: boolean;
  showAchievements?: boolean;
  allowMessages?: 'everyone' | 'friends' | 'none';
  allowFriendRequests?: boolean;
  dataCollection?: boolean;
  personalization?: boolean;
  analytics?: boolean;
}

export interface SettingsPreferences {
  appearance: AppearanceSettingsPreference;
  language: LanguageSettingsPreference;
  notifications: NotificationSettingsPreference;
  privacy: PrivacySettingsPreference;
}

export const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettingsPreference = {
  theme: 'light',
  fontSize: 'medium',
  reducedMotion: false,
  highContrast: false,
  compactMode: false,
  efficiencyMode: false,
};

export const DEFAULT_LANGUAGE_SETTINGS: LanguageSettingsPreference = {
  language: 'ar',
  numberFormat: 'western',
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettingsPreference = {
  notificationsEnabled: true,
  studyReminders: true,
  emailNotifications: true,
  pushNotifications: true,
  // Additional fields with defaults
  taskReminders: true,
  taskReminderTime: '30',
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
  profileVisibility: 'public',
  showOnlineStatus: true,
  showProgress: true,
  showLastSeen: true,
  showAchievements: true,
  allowMessages: 'everyone',
  allowFriendRequests: true,
  dataCollection: true,
  personalization: true,
  analytics: true,
};

export const DEFAULT_SETTINGS: SettingsPreferences = {
  appearance: DEFAULT_APPEARANCE_SETTINGS,
  language: DEFAULT_LANGUAGE_SETTINGS,
  notifications: DEFAULT_NOTIFICATION_SETTINGS,
  privacy: DEFAULT_PRIVACY_SETTINGS,
};

export interface SettingsPreferencesPatch {
  appearance?: Partial<AppearanceSettingsPreference>;
  language?: Partial<LanguageSettingsPreference>;
  notifications?: Partial<NotificationSettingsPreference>;
  privacy?: Partial<PrivacySettingsPreference>;
}