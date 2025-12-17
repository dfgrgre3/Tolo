import { useEffect, useState, useCallback } from "react";
import { ensureUser } from "@/lib/user-utils";
import { logger } from "@/lib/logger";
import type { AccountUser, EditForm, NotificationSettings } from "../types";

interface UseAccountDataReturn {
	userId: string | null;
	user: AccountUser | null;
	loading: boolean;
	error: Error | null;
	editForm: EditForm;
	setEditForm: React.Dispatch<React.SetStateAction<EditForm>>;
	notificationSettings: NotificationSettings;
	setNotificationSettings: React.Dispatch<React.SetStateAction<NotificationSettings>>;
	setUser: React.Dispatch<React.SetStateAction<AccountUser | null>>;
	refetch: () => Promise<void>;
}

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
	emailNotifications: true,
	smsNotifications: false,
	taskReminders: true,
	examReminders: true,
	progressReports: false,
	marketingEmails: false,
};

export function useAccountData(): UseAccountDataReturn {
	const [userId, setUserId] = useState<string | null>(null);
	const [user, setUser] = useState<AccountUser | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);
	const [editForm, setEditForm] = useState<EditForm>({
		name: "",
		email: "",
		bio: "",
		grade: "",
		school: "",
	});
	const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(
		DEFAULT_NOTIFICATION_SETTINGS
	);

	useEffect(() => {
		let isMounted = true;

		const initializeUser = async () => {
			try {
				const id = await ensureUser();
				if (isMounted) {
					setUserId(id);
				}
			} catch (err) {
				if (isMounted) {
					const error = err instanceof Error ? err : new Error("فشل في الحصول على معرف المستخدم");
					setError(error);
					logger.error("Error initializing user:", error);
				}
			}
		};

		initializeUser();

		return () => {
			isMounted = false;
		};
	}, []);

	const fetchUserData = useCallback(async (id: string) => {
		try {
			const res = await fetch(`/api/users/${id}`);
			if (!res.ok) {
				throw new Error(`فشل في جلب بيانات المستخدم: ${res.statusText}`);
			}
			const userData: AccountUser = await res.json();
			setUser(userData);
			setEditForm({
				name: userData.name || "",
				email: userData.email || "",
				bio: userData.bio || "",
				grade: userData.grade || "",
				school: userData.school || "",
			});
			setError(null);
		} catch (err) {
			const error = err instanceof Error ? err : new Error("حدث خطأ أثناء جلب بيانات المستخدم");
			setError(error);
			logger.error("Error fetching user data:", error);
		}
	}, []);

	const fetchSettings = useCallback(async () => {
		try {
			const notifRes = await fetch(`/api/user/notification-settings`);
			if (notifRes.ok) {
				const notifData = await notifRes.json();
				setNotificationSettings((prev) => ({
					...prev,
					emailNotifications: notifData.emailNotifications ?? prev.emailNotifications,
					smsNotifications: notifData.smsNotifications ?? prev.smsNotifications,
				}));
			}
		} catch (err) {
			logger.error("Error fetching notification settings:", err);
			// Don't set error state for settings as it's not critical
		}
	}, []);

	const refetch = useCallback(async () => {
		if (!userId) return;
		setLoading(true);
		try {
			await Promise.all([fetchUserData(userId), fetchSettings()]);
		} finally {
			setLoading(false);
		}
	}, [userId, fetchUserData, fetchSettings]);

	useEffect(() => {
		if (!userId) {
			setLoading(false);
			return;
		}

		let isMounted = true;

		const loadData = async () => {
			setLoading(true);
			setError(null);
			try {
				await Promise.all([fetchUserData(userId), fetchSettings()]);
			} finally {
				if (isMounted) {
					setLoading(false);
				}
			}
		};

		loadData();

		return () => {
			isMounted = false;
		};
	}, [userId, fetchUserData, fetchSettings]);

	return {
		userId,
		user,
		loading,
		error,
		editForm,
		setEditForm,
		notificationSettings,
		setNotificationSettings,
		setUser,
		refetch,
	};
}

