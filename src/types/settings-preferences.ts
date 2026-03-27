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



export interface SettingsPreferences {
  notifications: NotificationSettingsPreference;
  privacy: PrivacySettingsPreference;
}

export interface SettingsPreferencesPatch {
  notifications?: Partial<NotificationSettingsPreference>;
  privacy?: Partial<PrivacySettingsPreference>;
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


