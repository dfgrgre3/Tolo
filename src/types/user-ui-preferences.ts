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
  // Additional fields can be added later
  taskReminders?: boolean;
  taskReminderTime?: string;
  dailyGoalReminders?: boolean;
  examReminders?: boolean;
  examReminderDays?: number;
  deadlineReminders?: boolean;
  progressReports?: boolean;
  weeklyReport?: boolean;
  achievementAlerts?: boolean;
  commentNotifications?: boolean;
  mentionNotifications?: boolean;
  pushEnabled?: boolean;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  soundEnabled?: boolean;
  vibrationEnabled?: boolean;
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

export interface SettingsPreferencesPatch {
  appearance?: Partial<AppearanceSettingsPreference>;
  language?: Partial<LanguageSettingsPreference>;
  notifications?: Partial<NotificationSettingsPreference>;
  privacy?: Partial<PrivacySettingsPreference>;
}