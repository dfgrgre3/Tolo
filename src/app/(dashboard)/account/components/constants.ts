/**
 * Constants for Account Components
 * Centralized constants to avoid hardcoded values
 */

export const THEME_OPTIONS = [
	{ value: "light", label: "فاتح", icon: "Sun" },
	{ value: "dark", label: "داكن", icon: "Moon" },
	{ value: "system", label: "نظام", icon: undefined },
] as const;

export const FONT_SIZE_OPTIONS = [
	{ value: "small", label: "صغير" },
	{ value: "medium", label: "متوسط" },
	{ value: "large", label: "كبير" },
] as const;

export const PRIMARY_COLOR_OPTIONS = [
	{ value: "blue", label: "أزرق" },
	{ value: "green", label: "أخضر" },
	{ value: "purple", label: "بنفسجي" },
	{ value: "red", label: "أحمر" },
	{ value: "orange", label: "برتقالي" },
] as const;

export const LANGUAGE_OPTIONS = [
	{ value: "ar", label: "العربية" },
	{ value: "en", label: "English" },
	{ value: "fr", label: "Français" },
] as const;

export const DATE_FORMAT_OPTIONS = [
	{ value: "hijri", label: "هجري" },
	{ value: "gregorian", label: "ميلادي" },
] as const;

export const TIMEZONE_OPTIONS = [
	{ value: "ast", label: "توقيت السعودية (AST)" },
	{ value: "gmt", label: "توقيت جرينتش (GMT)" },
	{ value: "est", label: "توقيت شرق أمريكا (EST)" },
] as const;

export const PROFILE_VISIBILITY_OPTIONS = [
	{ value: "public", label: "عام - يمكن للجميع رؤيته" },
	{ value: "friends", label: "الأصدقاء فقط" },
	{ value: "private", label: "خاص - أنا فقط" },
] as const;

export const DELETE_CONFIRMATION_TEXT = "حذف";

export const DEFAULT_APPEARANCE_SETTINGS = {
	theme: "light" as const,
	fontSize: "medium" as const,
	primaryColor: "blue" as const,
};

export const DEFAULT_LANGUAGE_SETTINGS = {
	language: "ar" as const,
	dateFormat: "hijri" as const,
	timezone: "ast" as const,
};

export const DEFAULT_PRIVACY_SETTINGS = {
	profileVisibility: "public" as const,
	showEmail: false,
	showPhone: false,
	allowMessages: true,
	activityStatus: true,
};

