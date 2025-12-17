export type AccountUser = {
	id: string;
	name: string;
	email: string;
	avatar?: string;
	bio?: string;
	grade?: string;
	school?: string;
	createdAt: string;
	emailVerified?: boolean;
	phone?: string;
	phoneVerified?: boolean;
	provider?: "google" | "facebook" | string;
};

export type NotificationSettings = {
	emailNotifications: boolean;
	smsNotifications: boolean;
	taskReminders: boolean;
	examReminders: boolean;
	progressReports: boolean;
	marketingEmails: boolean;
};

export type Theme = "light" | "dark" | "system";
export type FontSize = "small" | "medium" | "large";
export type PrimaryColor = "blue" | "green" | "purple" | "red" | "orange";

export type AppearanceSettings = {
	theme: Theme;
	fontSize: FontSize;
	primaryColor: PrimaryColor;
};

export type Language = "ar" | "en" | "fr";
export type DateFormat = "hijri" | "gregorian";
export type Timezone = "ast" | "gmt" | "est";

export type LanguageSettings = {
	language: Language;
	dateFormat: DateFormat;
	timezone: Timezone;
};

export type ProfileVisibility = "public" | "friends" | "private";

export type PrivacySettings = {
	profileVisibility: ProfileVisibility;
	showEmail: boolean;
	showPhone: boolean;
	allowMessages: boolean;
	activityStatus: boolean;
};

export type EditForm = {
	name: string;
	email: string;
	bio: string;
	grade: string;
	school: string;
};

export type AccountSettings = {
	appearance: AppearanceSettings;
	language: LanguageSettings;
	privacy: PrivacySettings;
	notifications: NotificationSettings;
};

