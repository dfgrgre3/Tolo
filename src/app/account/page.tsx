"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
	User,
	Mail,
	Calendar,
	School,
	Edit,
	Save,
	X,
	Camera,
	Shield,
	Key,
	Link2,
	Settings,
	Trash2,
	AlertTriangle,
	CheckCircle2,
	Clock,
	Smartphone,
	Globe,
	Bell,
	Palette,
	Moon,
	Sun,
	Lock,
	Eye,
	EyeOff,
	Languages,
} from "lucide-react";
import { ensureUser } from "@/lib/user-utils";
import { useUnifiedAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import SecurityTab from "@/components/profile/SecurityTab";
import LoginMethods from "@/components/profile/LoginMethods";
import { logger } from '@/lib/logger';

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";

type User = {
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
	provider?: string;
};

export default function AccountPage() {
	const router = useRouter();
	const { user: authUser } = useUnifiedAuth();
	const [userId, setUserId] = useState<string | null>(null);
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState("overview");
	const [isEditing, setIsEditing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [editForm, setEditForm] = useState({
		name: "",
		email: "",
		bio: "",
		grade: "",
		school: "",
	});

	// Notification settings
	const [notificationSettings, setNotificationSettings] = useState({
		emailNotifications: true,
		smsNotifications: false,
		taskReminders: true,
		examReminders: true,
		progressReports: false,
		marketingEmails: false,
	});

	// Appearance settings
	const [appearanceSettings, setAppearanceSettings] = useState({
		theme: "light",
		fontSize: "medium",
		primaryColor: "blue",
	});

	// Language settings
	const [languageSettings, setLanguageSettings] = useState({
		language: "ar",
		dateFormat: "hijri",
		timezone: "ast",
	});

	// Privacy settings
	const [privacySettings, setPrivacySettings] = useState({
		profileVisibility: "public",
		showEmail: false,
		showPhone: false,
		allowMessages: true,
		activityStatus: true,
	});

	useEffect(() => {
		ensureUser().then(setUserId);
	}, []);

	useEffect(() => {
		if (!userId) return;

		const fetchUserData = async () => {
			try {
				const res = await fetch(`/api/users/${userId}`);
				if (res.ok) {
					const userData = await res.json();
					setUser(userData);
					setEditForm({
						name: userData.name,
						email: userData.email,
						bio: userData.bio || "",
						grade: userData.grade || "",
						school: userData.school || "",
					});
				}
			} catch (error) {
				logger.error("Error fetching user data:", error);
			} finally {
				setLoading(false);
			}
		};

		const fetchSettings = async () => {
			try {
				// Fetch notification settings
				const notifRes = await fetch(`/api/user/notification-settings`);
				if (notifRes.ok) {
					const notifData = await notifRes.json();
					setNotificationSettings((prev) => ({
						...prev,
						emailNotifications: notifData.emailNotifications ?? true,
						smsNotifications: notifData.smsNotifications ?? false,
					}));
				}
			} catch (error) {
				logger.error("Error fetching settings:", error);
			}
		};

		fetchUserData();
		fetchSettings();
	}, [userId]);

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
				setIsEditing(false);
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
			// Token is in httpOnly cookie - no need to send Authorization header
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
				// Clear local storage
				localStorage.clear();
				sessionStorage.clear();
				// Redirect to home
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
			// Token is in httpOnly cookie - no need to send Authorization header
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
		// Save appearance settings to localStorage for now
		localStorage.setItem("appearanceSettings", JSON.stringify(appearanceSettings));
		toast.success("تم حفظ إعدادات المظهر بنجاح");
		// Apply theme if changed
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
			// Token is in httpOnly cookie - no need to send Authorization header
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
					<CardContent className="pt-6 text-center space-y-4">
						<User className="h-16 w-16 text-muted-foreground mx-auto" />
						<div>
							<h3 className="text-lg font-semibold">الحساب غير موجود</h3>
							<p className="text-muted-foreground">لم يتم العثور على حسابك</p>
						</div>
						<Button onClick={() => router.push("/")}>العودة للصفحة الرئيسية</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<AuthGuard>
			<div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
				<div className="container mx-auto px-4 py-8 max-w-7xl">
					{/* Header Section */}
					<motion.div
						className="mb-8 space-y-2"
						initial={{ opacity: 0, y: -20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5 }}
					>
						<h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
							إدارة الحساب
						</h1>
						<p className="text-muted-foreground text-lg">إدارة معلوماتك الشخصية وإعدادات الحساب والأمان</p>
					</motion.div>

					<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
						{/* Sidebar - Account Summary */}
						<div className="lg:col-span-1 space-y-6">
							<Card className="overflow-hidden shadow-xl border-2 border-primary/10">
								<div className="h-24 bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 relative overflow-hidden">
									<div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />
								</div>
								<CardContent className="p-6 pt-0">
									<div className="flex flex-col items-center -mt-12">
										<motion.div
											className="relative mb-4"
											whileHover={{ scale: 1.05 }}
											transition={{ type: "spring", stiffness: 300 }}
										>
											<Avatar className="w-24 h-24 border-4 border-background shadow-2xl ring-4 ring-primary/20">
												<AvatarImage src={user.avatar} alt={user.name} />
												<AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
													{user.name.charAt(0).toUpperCase()}
												</AvatarFallback>
											</Avatar>
											<label
												htmlFor="avatar-upload-account"
												className="absolute bottom-0 right-0 bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-full p-2.5 cursor-pointer shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 ring-2 ring-background"
												title="رفع صورة شخصية جديدة"
											>
												<Camera className="h-4 w-4" />
												<span className="sr-only">رفع صورة شخصية جديدة</span>
											</label>
											<input
												id="avatar-upload-account"
												type="file"
												className="hidden"
												accept="image/*"
												onChange={handleAvatarUpload}
												aria-label="رفع صورة شخصية جديدة"
											/>
										</motion.div>

										<h2 className="text-xl font-bold mb-1 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
											{user.name}
										</h2>
										<p className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
											<Mail className="h-3 w-3 text-primary" />
											{user.email}
										</p>

										<div className="w-full space-y-2 text-sm">
											{user.emailVerified && (
												<Badge className="w-full justify-center bg-green-100 text-green-700 border-green-300">
													<CheckCircle2 className="h-3 w-3 ml-1" />
													البريد الإلكتروني مؤكد
												</Badge>
											)}
											{user.phoneVerified && (
												<Badge className="w-full justify-center bg-blue-100 text-blue-700 border-blue-300">
													<CheckCircle2 className="h-3 w-3 ml-1" />
													الهاتف مؤكد
												</Badge>
											)}
											{user.provider && (
												<Badge className="w-full justify-center bg-purple-100 text-purple-700 border-purple-300">
													<Link2 className="h-3 w-3 ml-1" />
													متصل بـ {user.provider === "google" ? "جوجل" : user.provider === "facebook" ? "فيسبوك" : user.provider}
												</Badge>
											)}
										</div>
									</div>
								</CardContent>
							</Card>

							{/* Quick Stats */}
							<Card className="shadow-lg border-2 border-primary/10">
								<CardHeader className="pb-3">
									<CardTitle className="text-sm font-semibold flex items-center gap-2">
										<Clock className="h-4 w-4" />
										معلومات الحساب
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3 text-sm">
									<div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
										<span className="text-muted-foreground flex items-center gap-2">
											<Calendar className="h-4 w-4" />
											انضم في:
										</span>
										<span className="font-semibold">{new Date(user.createdAt).toLocaleDateString("ar-EG")}</span>
									</div>
									{user.grade && (
										<div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
											<span className="text-muted-foreground flex items-center gap-2">
												<School className="h-4 w-4" />
												الصف:
											</span>
											<span className="font-semibold">{user.grade}</span>
										</div>
									)}
									{user.school && (
										<div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
											<span className="text-muted-foreground flex items-center gap-2">
												<School className="h-4 w-4" />
												المدرسة:
											</span>
											<span className="font-semibold text-xs">{user.school}</span>
										</div>
									)}
								</CardContent>
							</Card>
						</div>

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

								{/* Overview Tab */}
								<TabsContent value="overview" className="space-y-6">
									<Card>
										<CardHeader>
											<CardTitle className="flex items-center gap-2">
												<User className="h-5 w-5" />
												معلومات الحساب الأساسية
											</CardTitle>
											<CardDescription>عرض وتعديل معلوماتك الشخصية</CardDescription>
										</CardHeader>
										<CardContent className="space-y-4">
											<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
												<div>
													<Label className="text-muted-foreground">الاسم الكامل</Label>
													<p className="font-semibold mt-1">{user.name}</p>
												</div>
												<div>
													<Label className="text-muted-foreground">البريد الإلكتروني</Label>
													<p className="font-semibold mt-1 flex items-center gap-2">
														{user.email}
														{user.emailVerified && (
															<Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
																<CheckCircle2 className="h-3 w-3 ml-1" />
																مؤكد
															</Badge>
														)}
													</p>
												</div>
												{user.phone && (
													<div>
														<Label className="text-muted-foreground">رقم الهاتف</Label>
														<p className="font-semibold mt-1 flex items-center gap-2">
															{user.phone}
															{user.phoneVerified && (
																<Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
																	<CheckCircle2 className="h-3 w-3 ml-1" />
																	مؤكد
																</Badge>
															)}
														</p>
													</div>
												)}
												<div>
													<Label className="text-muted-foreground">تاريخ الانضمام</Label>
													<p className="font-semibold mt-1">{new Date(user.createdAt).toLocaleDateString("ar-EG", {
														year: "numeric",
														month: "long",
														day: "numeric",
													})}</p>
												</div>
											</div>
											{user.bio && (
												<div>
													<Label className="text-muted-foreground">نبذة شخصية</Label>
													<p className="mt-1 text-muted-foreground">{user.bio}</p>
												</div>
											)}
											<Button onClick={() => setActiveTab("information")} className="w-full md:w-auto">
												<Edit className="ml-2 h-4 w-4" />
												تعديل المعلومات
											</Button>
										</CardContent>
									</Card>

									<Card>
										<CardHeader>
											<CardTitle className="flex items-center gap-2">
												<Shield className="h-5 w-5" />
												حالة الأمان
											</CardTitle>
											<CardDescription>نظرة سريعة على إعدادات الأمان</CardDescription>
										</CardHeader>
										<CardContent>
											<div className="space-y-3">
												<div className="flex items-center justify-between p-3 rounded-lg border">
													<div className="flex items-center gap-3">
														<Key className="h-5 w-5 text-muted-foreground" />
														<div>
															<p className="font-medium">كلمة المرور</p>
															<p className="text-sm text-muted-foreground">آخر تحديث: غير متاح</p>
														</div>
													</div>
													<Button variant="outline" size="sm" onClick={() => setActiveTab("security")}>
														تغيير
													</Button>
												</div>
												<div className="flex items-center justify-between p-3 rounded-lg border">
													<div className="flex items-center gap-3">
														<Smartphone className="h-5 w-5 text-muted-foreground" />
														<div>
															<p className="font-medium">الجلسات النشطة</p>
															<p className="text-sm text-muted-foreground">إدارة أجهزتك المسجلة</p>
														</div>
													</div>
													<Button variant="outline" size="sm" onClick={() => setActiveTab("security")}>
														عرض
													</Button>
												</div>
											</div>
										</CardContent>
									</Card>
								</TabsContent>

								{/* Information Tab */}
								<TabsContent value="information" className="space-y-6">
									<Card>
										<CardHeader>
											<CardTitle>تعديل المعلومات الشخصية</CardTitle>
											<CardDescription>قم بتحديث معلوماتك الشخصية أدناه</CardDescription>
										</CardHeader>
										<CardContent>
											<form onSubmit={handleEditSubmit} className="space-y-4">
												<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
													<div className="space-y-2">
														<Label htmlFor="account-name">الاسم</Label>
														<Input
															id="account-name"
															name="name"
															value={editForm.name}
															onChange={handleInputChange}
															required
														/>
													</div>
													<div className="space-y-2">
														<Label htmlFor="account-email">البريد الإلكتروني</Label>
														<Input
															id="account-email"
															name="email"
															type="email"
															value={editForm.email}
															onChange={handleInputChange}
															required
														/>
													</div>
													<div className="space-y-2">
														<Label htmlFor="account-grade">الصف الدراسي</Label>
														<Input
															id="account-grade"
															name="grade"
															value={editForm.grade}
															onChange={handleInputChange}
														/>
													</div>
													<div className="space-y-2">
														<Label htmlFor="account-school">المدرسة</Label>
														<Input
															id="account-school"
															name="school"
															value={editForm.school}
															onChange={handleInputChange}
														/>
													</div>
												</div>
												<div className="space-y-2">
													<Label htmlFor="account-bio">نبذة شخصية</Label>
													<Textarea
														id="account-bio"
														name="bio"
														rows={4}
														value={editForm.bio}
														onChange={handleInputChange}
														placeholder="اكتب نبذة شخصية عنك..."
													/>
												</div>
												<div className="flex justify-end gap-3 pt-4">
													<Button type="button" variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
														<X className="ml-2 h-4 w-4" />
														إلغاء
													</Button>
													<Button type="submit" disabled={isSaving}>
														{isSaving ? (
															<>
																<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
																جاري الحفظ...
															</>
														) : (
															<>
																<Save className="ml-2 h-4 w-4" />
																حفظ التغييرات
															</>
														)}
													</Button>
												</div>
											</form>
										</CardContent>
									</Card>
								</TabsContent>

								{/* Notifications Tab */}
								<TabsContent value="notifications" className="space-y-6">
									<Card>
										<CardHeader>
											<CardTitle className="flex items-center gap-2">
												<Bell className="h-5 w-5" />
												إعدادات الإشعارات
											</CardTitle>
											<CardDescription>اختر كيف ومتى تريد تلقي الإشعارات</CardDescription>
										</CardHeader>
										<CardContent className="space-y-6">
											<div className="space-y-4">
												<div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
													<div className="space-y-0.5">
														<Label htmlFor="email-notifications" className="text-base font-semibold">
															الإشعارات عبر البريد الإلكتروني
														</Label>
														<p className="text-sm text-muted-foreground">
															تلقي الإشعارات المهمة عبر البريد الإلكتروني
														</p>
													</div>
													<Switch
														id="email-notifications"
														checked={notificationSettings.emailNotifications}
														onCheckedChange={(checked) =>
															setNotificationSettings((prev) => ({ ...prev, emailNotifications: checked }))
														}
													/>
												</div>

												<div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
													<div className="space-y-0.5">
														<Label htmlFor="sms-notifications" className="text-base font-semibold">
															الإشعارات عبر الرسائل النصية
														</Label>
														<p className="text-sm text-muted-foreground">
															تلقي الإشعارات المهمة عبر الرسائل النصية
														</p>
													</div>
													<Switch
														id="sms-notifications"
														checked={notificationSettings.smsNotifications}
														onCheckedChange={(checked) =>
															setNotificationSettings((prev) => ({ ...prev, smsNotifications: checked }))
														}
													/>
												</div>

												<Separator />

												<div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
													<div className="space-y-0.5">
														<Label htmlFor="task-reminders" className="text-base font-semibold">
															تذكيرات المهام
														</Label>
														<p className="text-sm text-muted-foreground">
															تلقي تذكيرات عند اقتراب موعد المهام
														</p>
													</div>
													<Switch
														id="task-reminders"
														checked={notificationSettings.taskReminders}
														onCheckedChange={(checked) =>
															setNotificationSettings((prev) => ({ ...prev, taskReminders: checked }))
														}
													/>
												</div>

												<div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
													<div className="space-y-0.5">
														<Label htmlFor="exam-reminders" className="text-base font-semibold">
															تذكيرات الامتحانات
														</Label>
														<p className="text-sm text-muted-foreground">
															تلقي تذكيرات قبل موعد الامتحانات
														</p>
													</div>
													<Switch
														id="exam-reminders"
														checked={notificationSettings.examReminders}
														onCheckedChange={(checked) =>
															setNotificationSettings((prev) => ({ ...prev, examReminders: checked }))
														}
													/>
												</div>

												<div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
													<div className="space-y-0.5">
														<Label htmlFor="progress-reports" className="text-base font-semibold">
															تقارير التقدم
														</Label>
														<p className="text-sm text-muted-foreground">
															تلقي تقارير أسبوعية عن تقدمك الدراسي
														</p>
													</div>
													<Switch
														id="progress-reports"
														checked={notificationSettings.progressReports}
														onCheckedChange={(checked) =>
															setNotificationSettings((prev) => ({ ...prev, progressReports: checked }))
														}
													/>
												</div>

												<div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
													<div className="space-y-0.5">
														<Label htmlFor="marketing-emails" className="text-base font-semibold">
															رسائل تسويقية
														</Label>
														<p className="text-sm text-muted-foreground">
															تلقي عروض ورسائل ترويجية من المنصة
														</p>
													</div>
													<Switch
														id="marketing-emails"
														checked={notificationSettings.marketingEmails}
														onCheckedChange={(checked) =>
															setNotificationSettings((prev) => ({ ...prev, marketingEmails: checked }))
														}
													/>
												</div>
											</div>

											<div className="flex justify-end pt-4">
												<Button onClick={handleSaveNotifications} disabled={isSaving}>
													{isSaving ? (
														<>
															<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
															جاري الحفظ...
														</>
													) : (
														<>
															<Save className="ml-2 h-4 w-4" />
															حفظ الإعدادات
														</>
													)}
												</Button>
											</div>
										</CardContent>
									</Card>
								</TabsContent>

								{/* Appearance Tab */}
								<TabsContent value="appearance" className="space-y-6">
									<Card>
										<CardHeader>
											<CardTitle className="flex items-center gap-2">
												<Palette className="h-5 w-5" />
												إعدادات المظهر
											</CardTitle>
											<CardDescription>تخصيص مظهر واجهة المنصة حسب تفضيلاتك</CardDescription>
										</CardHeader>
										<CardContent className="space-y-6">
											<div className="space-y-4">
												<div className="space-y-2">
													<Label htmlFor="theme" className="text-base font-semibold">
														الوضع
													</Label>
													<Select
														value={appearanceSettings.theme}
														onValueChange={(value) =>
															setAppearanceSettings((prev) => ({ ...prev, theme: value }))
														}
													>
														<SelectTrigger id="theme">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="light">
																<div className="flex items-center gap-2">
																	<Sun className="h-4 w-4" />
																	فاتح
																</div>
															</SelectItem>
															<SelectItem value="dark">
																<div className="flex items-center gap-2">
																	<Moon className="h-4 w-4" />
																	داكن
																</div>
															</SelectItem>
															<SelectItem value="system">نظام</SelectItem>
														</SelectContent>
													</Select>
												</div>

												<div className="space-y-2">
													<Label htmlFor="font-size" className="text-base font-semibold">
														حجم الخط
													</Label>
													<Select
														value={appearanceSettings.fontSize}
														onValueChange={(value) =>
															setAppearanceSettings((prev) => ({ ...prev, fontSize: value }))
														}
													>
														<SelectTrigger id="font-size">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="small">صغير</SelectItem>
															<SelectItem value="medium">متوسط</SelectItem>
															<SelectItem value="large">كبير</SelectItem>
														</SelectContent>
													</Select>
												</div>

												<div className="space-y-2">
													<Label htmlFor="primary-color" className="text-base font-semibold">
														اللون الأساسي
													</Label>
													<Select
														value={appearanceSettings.primaryColor}
														onValueChange={(value) =>
															setAppearanceSettings((prev) => ({ ...prev, primaryColor: value }))
														}
													>
														<SelectTrigger id="primary-color">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="blue">أزرق</SelectItem>
															<SelectItem value="green">أخضر</SelectItem>
															<SelectItem value="purple">بنفسجي</SelectItem>
															<SelectItem value="red">أحمر</SelectItem>
															<SelectItem value="orange">برتقالي</SelectItem>
														</SelectContent>
													</Select>
												</div>
											</div>

											<div className="flex justify-end pt-4">
												<Button onClick={handleSaveAppearance}>
													<Save className="ml-2 h-4 w-4" />
													حفظ الإعدادات
												</Button>
											</div>
										</CardContent>
									</Card>
								</TabsContent>

								{/* Language Tab */}
								<TabsContent value="language" className="space-y-6">
									<Card>
										<CardHeader>
											<CardTitle className="flex items-center gap-2">
												<Languages className="h-5 w-5" />
												إعدادات اللغة
											</CardTitle>
											<CardDescription>اختر اللغة والتنسيقات المفضلة لديك</CardDescription>
										</CardHeader>
										<CardContent className="space-y-6">
											<div className="space-y-4">
												<div className="space-y-2">
													<Label htmlFor="language" className="text-base font-semibold">
														لغة الواجهة
													</Label>
													<Select
														value={languageSettings.language}
														onValueChange={(value) =>
															setLanguageSettings((prev) => ({ ...prev, language: value }))
														}
													>
														<SelectTrigger id="language">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="ar">العربية</SelectItem>
															<SelectItem value="en">English</SelectItem>
															<SelectItem value="fr">Français</SelectItem>
														</SelectContent>
													</Select>
												</div>

												<div className="space-y-2">
													<Label htmlFor="date-format" className="text-base font-semibold">
														تنسيق التاريخ
													</Label>
													<Select
														value={languageSettings.dateFormat}
														onValueChange={(value) =>
															setLanguageSettings((prev) => ({ ...prev, dateFormat: value }))
														}
													>
														<SelectTrigger id="date-format">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="hijri">هجري</SelectItem>
															<SelectItem value="gregorian">ميلادي</SelectItem>
														</SelectContent>
													</Select>
												</div>

												<div className="space-y-2">
													<Label htmlFor="timezone" className="text-base font-semibold">
														المنطقة الزمنية
													</Label>
													<Select
														value={languageSettings.timezone}
														onValueChange={(value) =>
															setLanguageSettings((prev) => ({ ...prev, timezone: value }))
														}
													>
														<SelectTrigger id="timezone">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="ast">توقيت السعودية (AST)</SelectItem>
															<SelectItem value="gmt">توقيت جرينتش (GMT)</SelectItem>
															<SelectItem value="est">توقيت شرق أمريكا (EST)</SelectItem>
														</SelectContent>
													</Select>
												</div>
											</div>

											<div className="flex justify-end pt-4">
												<Button onClick={handleSaveLanguage}>
													<Save className="ml-2 h-4 w-4" />
													حفظ الإعدادات
												</Button>
											</div>
										</CardContent>
									</Card>
								</TabsContent>

								{/* Privacy Tab */}
								<TabsContent value="privacy" className="space-y-6">
									<Card>
										<CardHeader>
											<CardTitle className="flex items-center gap-2">
												<Lock className="h-5 w-5" />
												إعدادات الخصوصية
											</CardTitle>
											<CardDescription>تحكم في من يمكنه رؤية معلوماتك الشخصية</CardDescription>
										</CardHeader>
										<CardContent className="space-y-6">
											<div className="space-y-4">
												<div className="space-y-2">
													<Label htmlFor="profile-visibility" className="text-base font-semibold">
														رؤية الملف الشخصي
													</Label>
													<Select
														value={privacySettings.profileVisibility}
														onValueChange={(value) =>
															setPrivacySettings((prev) => ({ ...prev, profileVisibility: value }))
														}
													>
														<SelectTrigger id="profile-visibility">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="public">عام - يمكن للجميع رؤيته</SelectItem>
															<SelectItem value="friends">الأصدقاء فقط</SelectItem>
															<SelectItem value="private">خاص - أنا فقط</SelectItem>
														</SelectContent>
													</Select>
												</div>

												<Separator />

												<div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
													<div className="space-y-0.5">
														<Label htmlFor="show-email" className="text-base font-semibold">
															إظهار البريد الإلكتروني
														</Label>
														<p className="text-sm text-muted-foreground">
															السماح للآخرين برؤية بريدك الإلكتروني
														</p>
													</div>
													<Switch
														id="show-email"
														checked={privacySettings.showEmail}
														onCheckedChange={(checked) =>
															setPrivacySettings((prev) => ({ ...prev, showEmail: checked }))
														}
													/>
												</div>

												<div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
													<div className="space-y-0.5">
														<Label htmlFor="show-phone" className="text-base font-semibold">
															إظهار رقم الهاتف
														</Label>
														<p className="text-sm text-muted-foreground">
															السماح للآخرين برؤية رقم هاتفك
														</p>
													</div>
													<Switch
														id="show-phone"
														checked={privacySettings.showPhone}
														onCheckedChange={(checked) =>
															setPrivacySettings((prev) => ({ ...prev, showPhone: checked }))
														}
													/>
												</div>

												<div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
													<div className="space-y-0.5">
														<Label htmlFor="allow-messages" className="text-base font-semibold">
															السماح بالرسائل
														</Label>
														<p className="text-sm text-muted-foreground">
															السماح للآخرين بإرسال رسائل خاصة لك
														</p>
													</div>
													<Switch
														id="allow-messages"
														checked={privacySettings.allowMessages}
														onCheckedChange={(checked) =>
															setPrivacySettings((prev) => ({ ...prev, allowMessages: checked }))
														}
													/>
												</div>

												<div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
													<div className="space-y-0.5">
														<Label htmlFor="activity-status" className="text-base font-semibold">
															حالة النشاط
														</Label>
														<p className="text-sm text-muted-foreground">
															إظهار حالة نشاطك (متصل/غير متصل)
														</p>
													</div>
													<Switch
														id="activity-status"
														checked={privacySettings.activityStatus}
														onCheckedChange={(checked) =>
															setPrivacySettings((prev) => ({ ...prev, activityStatus: checked }))
														}
													/>
												</div>
											</div>

											<div className="flex justify-end pt-4">
												<Button onClick={handleSavePrivacy} disabled={isSaving}>
													{isSaving ? (
														<>
															<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
															جاري الحفظ...
														</>
													) : (
														<>
															<Save className="ml-2 h-4 w-4" />
															حفظ الإعدادات
														</>
													)}
												</Button>
											</div>
										</CardContent>
									</Card>
								</TabsContent>

								{/* Security Tab */}
								<TabsContent value="security" className="space-y-6">
									{userId && <SecurityTab userId={userId} />}
								</TabsContent>

								{/* Connected Accounts Tab */}
								<TabsContent value="connected" className="space-y-6">
									<Card>
										<CardHeader>
											<CardTitle className="flex items-center gap-2">
												<Link2 className="h-5 w-5" />
												الحسابات المتصلة
											</CardTitle>
											<CardDescription>إدارة حساباتك المتصلة بخدمات خارجية</CardDescription>
										</CardHeader>
										<CardContent>
											{userId && <LoginMethods userId={userId} />}
										</CardContent>
									</Card>
								</TabsContent>

								{/* Danger Zone Tab */}
								<TabsContent value="danger" className="space-y-6">
									<Alert variant="destructive">
										<AlertTriangle className="h-4 w-4" />
										<AlertTitle>منطقة الخطر</AlertTitle>
										<AlertDescription>
											الإجراءات التالية لا يمكن التراجع عنها. يرجى التأكد قبل المتابعة.
										</AlertDescription>
									</Alert>

									<Card className="border-destructive">
										<CardHeader>
											<CardTitle className="text-destructive flex items-center gap-2">
												<Trash2 className="h-5 w-5" />
												حذف الحساب
											</CardTitle>
											<CardDescription>
												حذف حسابك بشكل دائم. سيتم حذف جميع بياناتك ولا يمكن استعادتها.
											</CardDescription>
										</CardHeader>
										<CardContent>
											<DeleteAccountDialog onConfirm={handleDeleteAccount} />
										</CardContent>
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

// Delete Account Dialog Component
function DeleteAccountDialog({ onConfirm }: { onConfirm: () => void }) {
	const [open, setOpen] = useState(false);
	const [confirmText, setConfirmText] = useState("");
	const isConfirmed = confirmText === "حذف";

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="destructive">
					<Trash2 className="ml-2 h-4 w-4" />
					حذف الحساب نهائياً
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>هل أنت متأكد؟</DialogTitle>
					<DialogDescription>
						هذا الإجراء لا يمكن التراجع عنه. سيتم حذف حسابك بشكل دائم وجميع بياناتك المرتبطة به.
						<br />
						<br />
						يرجى كتابة <strong>حذف</strong> في الحقل أدناه للتأكيد.
					</DialogDescription>
				</DialogHeader>
				<div className="py-4">
					<Input
						placeholder="اكتب 'حذف' للتأكيد"
						value={confirmText}
						onChange={(e) => setConfirmText(e.target.value)}
					/>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)}>
						إلغاء
					</Button>
					<Button
						variant="destructive"
						onClick={() => {
							if (isConfirmed) {
								onConfirm();
								setOpen(false);
							}
						}}
						disabled={!isConfirmed}
					>
						حذف الحساب
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

