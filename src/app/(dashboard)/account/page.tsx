"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/app/(auth)/components/AuthGuard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
	User,
	Edit,
	Bell,
	Palette,
	Languages,
	Lock,
	Shield,
	Link2,
	Trash2,
	AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import SecurityTab from "@/app/(dashboard)/profile/components/SecurityTab";
import LoginMethods from "@/app/(dashboard)/profile/components/LoginMethods";
import { logger } from "@/lib/logger";
import {
	AccountHeader,
	AccountSidebar,
	AccountOverviewTab,
	AccountInformationTab,
	AccountNotificationsTab,
	AccountAppearanceTab,
	AccountLanguageTab,
	AccountPrivacyTab,
	DeleteAccountDialog,
	useAccountData,
	type AppearanceSettings,
	type LanguageSettings,
	type PrivacySettings,
} from "./components";

export default function AccountPage() {
	const router = useRouter();
	const {
		userId,
		user,
		loading,
		editForm,
		setEditForm,
		notificationSettings,
		setNotificationSettings,
		setUser,
	} = useAccountData();

	const [activeTab, setActiveTab] = useState("overview");
	const [isSaving, setIsSaving] = useState(false);

	// Appearance settings
	const [appearanceSettings, setAppearanceSettings] = useState<AppearanceSettings>({
		theme: "light",
		fontSize: "medium",
		primaryColor: "blue",
	});

	// Language settings
	const [languageSettings, setLanguageSettings] = useState<LanguageSettings>({
		language: "ar",
		dateFormat: "hijri",
		timezone: "ast",
	});

	// Privacy settings
	const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
		profileVisibility: "public",
		showEmail: false,
		showPhone: false,
		allowMessages: true,
		activityStatus: true,
	});

	const handleEditSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!userId) return;

		setIsSaving(true);
		try {
			const res = await fetch(`/api/users/${userId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(editForm),
			});

			if (res.ok) {
				const updatedUser = await res.json();
				setUser(updatedUser);
				toast.success("تم تحديث معلومات الحساب بنجاح");
			} else {
				const errorData = await res.json().catch(() => ({ error: "حدث خطأ غير معروف" }));
				toast.error(errorData.error || "حدث خطأ أثناء تحديث الحساب");
			}
		} catch (error) {
			logger.error("Error updating user account:", error);
			toast.error("حدث خطأ أثناء تحديث الحساب");
		} finally {
			setIsSaving(false);
		}
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		const { name, value } = e.target;
		setEditForm((prev) => ({ ...prev, [name]: value }));
	};

	const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		if (!e.target.files || !e.target.files[0] || !userId) return;

		const file = e.target.files[0];
		const formData = new FormData();
		formData.append("avatar", file);

		try {
			const res = await fetch(`/api/users/${userId}/avatar`, {
				method: "POST",
				body: formData,
			});

			if (res.ok) {
				const updatedUser = await res.json();
				setUser(updatedUser);
				toast.success("تم تحديث الصورة الشخصية بنجاح");
			} else {
				toast.error("حدث خطأ أثناء رفع الصورة");
			}
		} catch (error) {
			logger.error("Error uploading avatar:", error);
			toast.error("حدث خطأ أثناء رفع الصورة");
		}
	};

	const handleDeleteAccount = async () => {
		if (!userId) return;

		try {
			const headers: HeadersInit = {
				"Content-Type": "application/json",
			};

			const res = await fetch(`/api/users/${userId}`, {
				method: "DELETE",
				headers,
				credentials: "include",
			});

			if (res.ok) {
				toast.success("تم حذف الحساب بنجاح");
				localStorage.clear();
				sessionStorage.clear();
				setTimeout(() => {
					router.push("/");
				}, 1000);
			} else {
				const errorData = await res.json().catch(() => ({ error: "حدث خطأ غير معروف" }));
				toast.error(errorData.error || "حدث خطأ أثناء حذف الحساب");
			}
		} catch (error) {
			logger.error("Error deleting account:", error);
			toast.error("حدث خطأ أثناء حذف الحساب");
		}
	};

	const handleSaveNotifications = async () => {
		if (!userId) return;
		setIsSaving(true);
		try {
			const headers: HeadersInit = {
				"Content-Type": "application/json",
			};

			const res = await fetch(`/api/user/notification-settings`, {
				method: "PUT",
				headers,
				credentials: "include",
				body: JSON.stringify({
					emailNotifications: notificationSettings.emailNotifications,
					smsNotifications: notificationSettings.smsNotifications,
				}),
			});

			if (res.ok) {
				toast.success("تم حفظ إعدادات الإشعارات بنجاح");
			} else {
				toast.error("حدث خطأ أثناء حفظ الإعدادات");
			}
		} catch (error) {
			logger.error("Error saving notification settings:", error);
			toast.error("حدث خطأ أثناء حفظ الإعدادات");
		} finally {
			setIsSaving(false);
		}
	};

	const handleSaveAppearance = async () => {
		localStorage.setItem("appearanceSettings", JSON.stringify(appearanceSettings));
		toast.success("تم حفظ إعدادات المظهر بنجاح");
		if (appearanceSettings.theme === "dark") {
			document.documentElement.classList.add("dark");
		} else {
			document.documentElement.classList.remove("dark");
		}
	};

	const handleSaveLanguage = async () => {
		localStorage.setItem("languageSettings", JSON.stringify(languageSettings));
		toast.success("تم حفظ إعدادات اللغة بنجاح");
	};

	const handleSavePrivacy = async () => {
		if (!userId) return;
		setIsSaving(true);
		try {
			const headers: HeadersInit = {
				"Content-Type": "application/json",
			};

			const res = await fetch(`/api/users/${userId}`, {
				method: "PATCH",
				headers,
				body: JSON.stringify(privacySettings),
			});

			if (res.ok) {
				toast.success("تم حفظ إعدادات الخصوصية بنجاح");
			} else {
				toast.error("حدث خطأ أثناء حفظ الإعدادات");
			}
		} catch (error) {
			logger.error("Error saving privacy settings:", error);
			toast.error("حدث خطأ أثناء حفظ الإعدادات");
		} finally {
			setIsSaving(false);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
				<div className="text-center space-y-4">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
					<p className="text-lg font-medium text-muted-foreground">جاري تحميل الحساب...</p>
				</div>
			</div>
		);
	}

	if (!user) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
				<Card className="max-w-md shadow-xl border-2">
					<div className="pt-6 text-center space-y-4">
						<User className="h-16 w-16 text-muted-foreground mx-auto" />
						<div>
							<h3 className="text-lg font-semibold">الحساب غير موجود</h3>
							<p className="text-muted-foreground">لم يتم العثور على حسابك</p>
						</div>
						<Button onClick={() => router.push("/")}>
							العودة للصفحة الرئيسية
						</Button>
					</div>
				</Card>
			</div>
		);
	}

	return (
		<AuthGuard>
			<div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
				<div className="container mx-auto px-4 py-8 max-w-7xl">
					<AccountHeader />

					<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
						<AccountSidebar user={user} onAvatarUpload={handleAvatarUpload} />

						{/* Main Content */}
						<div className="lg:col-span-3">
							<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
								<TabsList className="grid w-full grid-cols-3 md:grid-cols-5 lg:grid-cols-9 mb-6 gap-1">
									<TabsTrigger value="overview" className="flex items-center gap-2">
										<User className="h-4 w-4" />
										<span className="hidden sm:inline">نظرة عامة</span>
									</TabsTrigger>
									<TabsTrigger value="information" className="flex items-center gap-2">
										<Edit className="h-4 w-4" />
										<span className="hidden sm:inline">المعلومات</span>
									</TabsTrigger>
									<TabsTrigger value="notifications" className="flex items-center gap-2">
										<Bell className="h-4 w-4" />
										<span className="hidden sm:inline">الإشعارات</span>
									</TabsTrigger>
									<TabsTrigger value="appearance" className="flex items-center gap-2">
										<Palette className="h-4 w-4" />
										<span className="hidden sm:inline">المظهر</span>
									</TabsTrigger>
									<TabsTrigger value="language" className="flex items-center gap-2">
										<Languages className="h-4 w-4" />
										<span className="hidden sm:inline">اللغة</span>
									</TabsTrigger>
									<TabsTrigger value="privacy" className="flex items-center gap-2">
										<Lock className="h-4 w-4" />
										<span className="hidden sm:inline">الخصوصية</span>
									</TabsTrigger>
									<TabsTrigger value="security" className="flex items-center gap-2">
										<Shield className="h-4 w-4" />
										<span className="hidden sm:inline">الأمان</span>
									</TabsTrigger>
									<TabsTrigger value="connected" className="flex items-center gap-2">
										<Link2 className="h-4 w-4" />
										<span className="hidden sm:inline">الحسابات</span>
									</TabsTrigger>
									<TabsTrigger value="danger" className="flex items-center gap-2 text-destructive">
										<Trash2 className="h-4 w-4" />
										<span className="hidden sm:inline">خطر</span>
									</TabsTrigger>
								</TabsList>

								<TabsContent value="overview" className="space-y-6">
									<AccountOverviewTab
										user={user}
										onEditClick={() => setActiveTab("information")}
										onSecurityClick={() => setActiveTab("security")}
									/>
								</TabsContent>

								<TabsContent value="information" className="space-y-6">
									<AccountInformationTab
										editForm={editForm}
										onInputChange={handleInputChange}
										onSubmit={handleEditSubmit}
										onCancel={() => setActiveTab("overview")}
										isSaving={isSaving}
									/>
								</TabsContent>

								<TabsContent value="notifications" className="space-y-6">
									<AccountNotificationsTab
										notificationSettings={notificationSettings}
										onSettingsChange={setNotificationSettings}
										onSave={handleSaveNotifications}
										isSaving={isSaving}
									/>
								</TabsContent>

								<TabsContent value="appearance" className="space-y-6">
									<AccountAppearanceTab
										appearanceSettings={appearanceSettings}
										onSettingsChange={setAppearanceSettings}
										onSave={handleSaveAppearance}
									/>
								</TabsContent>

								<TabsContent value="language" className="space-y-6">
									<AccountLanguageTab
										languageSettings={languageSettings}
										onSettingsChange={setLanguageSettings}
										onSave={handleSaveLanguage}
									/>
								</TabsContent>

								<TabsContent value="privacy" className="space-y-6">
									<AccountPrivacyTab
										privacySettings={privacySettings}
										onSettingsChange={setPrivacySettings}
										onSave={handleSavePrivacy}
										isSaving={isSaving}
									/>
								</TabsContent>

								<TabsContent value="security" className="space-y-6">
									{userId && <SecurityTab userId={userId} />}
								</TabsContent>

								<TabsContent value="connected" className="space-y-6">
									<Card>
										<div className="p-6">
											<div className="mb-4">
												<h3 className="text-lg font-semibold flex items-center gap-2">
													<Link2 className="h-5 w-5" />
													الحسابات المتصلة
												</h3>
												<p className="text-sm text-muted-foreground">
													إدارة حساباتك المتصلة بخدمات خارجية
												</p>
											</div>
											<div>
												{userId && <LoginMethods userId={userId} />}
											</div>
										</div>
									</Card>
								</TabsContent>

								<TabsContent value="danger" className="space-y-6">
									<Alert variant="destructive">
										<AlertTriangle className="h-4 w-4" />
										<AlertTitle>منطقة الخطر</AlertTitle>
										<AlertDescription>
											الإجراءات التالية لا يمكن التراجع عنها. يرجى التأكد قبل المتابعة.
										</AlertDescription>
									</Alert>

									<Card className="border-destructive">
										<div className="p-6">
											<div className="mb-4">
												<h3 className="text-lg font-semibold text-destructive flex items-center gap-2">
													<Trash2 className="h-5 w-5" />
													حذف الحساب
												</h3>
												<p className="text-sm text-muted-foreground">
													حذف حسابك بشكل دائم. سيتم حذف جميع بياناتك ولا يمكن استعادتها.
												</p>
											</div>
											<div>
												<DeleteAccountDialog onConfirm={handleDeleteAccount} />
											</div>
										</div>
									</Card>
								</TabsContent>
							</Tabs>
						</div>
					</div>
				</div>
			</div>
		</AuthGuard>
	);
}
