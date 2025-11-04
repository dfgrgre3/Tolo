"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/shared/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/UserProvider";
import { User as UserIcon, Shield as ShieldIcon, Bell as BellIcon, Palette as PaletteIcon, Globe as GlobeIcon, Loader2 } from "lucide-react";
import { SettingsData, SubjectEnrollment, FocusStrategy, SubjectType } from "@/types/settings";
import { ensureUser } from "@/lib/user-utils";
import { getTokenFromStorage } from "@/lib/auth-client";

export default function SettingsPage() {
	const { user } = useAuth();
	const [userId, setUserId] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState("general");

	// General settings
	const [wakeUpTime, setWakeUpTime] = useState("");
	const [sleepTime, setSleepTime] = useState("");
	const [focusStrategy, setFocusStrategy] = useState<FocusStrategy>(FocusStrategy.POMODORO);
	const [subjects, setSubjects] = useState<SubjectEnrollment[]>([
		{ subject: SubjectType.MATH, targetWeeklyHours: 10 },
		{ subject: SubjectType.PHYSICS, targetWeeklyHours: 8 },
		{ subject: SubjectType.CHEMISTRY, targetWeeklyHours: 6 },
		{ subject: SubjectType.ARABIC, targetWeeklyHours: 4 },
		{ subject: SubjectType.ENGLISH, targetWeeklyHours: 4 },
	]);
	const [recs, setRecs] = useState<{ title: string; message: string }[]>([]);

	// Security settings
	const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [isLoadingSettings, setIsLoadingSettings] = useState(true);

	// Notification settings
	const [taskReminders, setTaskReminders] = useState(true);
	const [examReminders, setExamReminders] = useState(true);
	const [progressReports, setProgressReports] = useState(false);
	const [smsNotifications, setSmsNotifications] = useState(false);

	// Appearance settings
	const [darkMode, setDarkMode] = useState(false);
	const [fontSize, setFontSize] = useState("medium");
	const [primaryColor, setPrimaryColor] = useState("blue");

	// Language settings
	const [language, setLanguage] = useState("ar");
	const [timezone, setTimezone] = useState("ast");
	const [dateFormat, setDateFormat] = useState("hijri");

	useEffect(() => {
		ensureUser().then((id) => setUserId(id));
	}, []);

	useEffect(() => {
		if (!userId) return;
		
		const fetchSettings = async () => {
			setIsLoadingSettings(true);
			try {
				const token = getTokenFromStorage();
				const headers: HeadersInit = {};
				if (token) {
					headers["Authorization"] = `Bearer ${token}`;
				}

				const res = await fetch(`/api/settings?userId=${userId}`, {
					headers,
					credentials: "include",
				});
				
				if (!res.ok) {
					let errorMessage = "فشل في تحميل الإعدادات";
					try {
						const errorData = await res.json();
						if (errorData.error) {
							errorMessage = errorData.error;
						}
					} catch {
						errorMessage = res.status === 401 
							? "غير مصرح - يرجى تسجيل الدخول مرة أخرى"
							: `فشل في تحميل الإعدادات (${res.status})`;
					}
					throw new Error(errorMessage);
				}
				
				const data: SettingsData = await res.json();
				if (data.user) {
					setWakeUpTime(data.user.wakeUpTime ?? "");
					setSleepTime(data.user.sleepTime ?? "");
					setFocusStrategy((data.user.focusStrategy as FocusStrategy) ?? FocusStrategy.POMODORO);
					setTwoFactorEnabled(data.user.twoFactorEnabled ?? false);
				}
				if (data.subjects?.length) setSubjects(data.subjects);
				
				// Fetch recommendations
				const recRes = await fetch(`/api/recommendations?userId=${userId}`, {
					headers: token ? { Authorization: `Bearer ${token}` } : {},
					credentials: "include",
				});
				if (recRes.ok) {
					const recData = await recRes.json();
					if (Array.isArray(recData)) {
						setRecs(recData);
					} else {
						setRecs([]);
					}
				}
			} catch (error: any) {
				console.error("Error fetching settings:", error);
				const errorMessage = error?.message || "فشل في تحميل الإعدادات";
				toast.error(errorMessage);
				setRecs([]);
			} finally {
				setIsLoadingSettings(false);
			}
		};

		fetchSettings();
	}, [userId]);

	useEffect(() => {
		if (user) {
			setIsLoading(false);
		}
	}, [user]);

	const saveGeneralSettings = useCallback(async () => {
		if (!userId) {
			toast.error("لم يتم العثور على معرف المستخدم");
			return;
		}

		setIsSaving(true);
		try {
			const token = getTokenFromStorage();
			const headers: HeadersInit = {
				"Content-Type": "application/json",
			};

			// Add authorization token if available
			if (token) {
				headers["Authorization"] = `Bearer ${token}`;
			}

			const response = await fetch("/api/settings", {
				method: "POST",
				headers,
				credentials: "include",
				body: JSON.stringify({ 
					userId, 
					wakeUpTime: wakeUpTime || null, 
					sleepTime: sleepTime || null, 
					focusStrategy, 
					subjects 
				}),
			});

			if (!response.ok) {
				// Try to get error message from response
				let errorMessage = "فشل في حفظ الإعدادات";
				let errorDetails: any = null;
				
				try {
					const errorData = await response.json();
					console.error("API Error Response:", errorData);
					
					if (errorData.error) {
						errorMessage = errorData.error;
					}
					
					// Include details in development mode
					if (errorData.details && process.env.NODE_ENV === 'development') {
						errorDetails = errorData.details;
						console.error("Error Details:", errorDetails);
					}
				} catch (parseError) {
					// If response is not JSON, use status text
					console.error("Failed to parse error response:", parseError);
					const responseText = await response.text().catch(() => '');
					console.error("Response text:", responseText);
					
					errorMessage = response.status === 401 
						? "غير مصرح - يرجى تسجيل الدخول مرة أخرى"
						: response.status === 403
						? "غير مسموح - لا يمكنك تحديث إعدادات مستخدم آخر"
						: response.status === 404
						? "المستخدم غير موجود"
						: `فشل في حفظ الإعدادات (${response.status})`;
				}
				
				const error = new Error(errorMessage);
				if (errorDetails) {
					(error as any).details = errorDetails;
				}
				throw error;
			}

			// Fetch updated recommendations
			const recRes = await fetch(`/api/recommendations?userId=${userId}`, {
				headers: token ? { Authorization: `Bearer ${token}` } : {},
				credentials: "include",
			});
			if (recRes.ok) {
				const recData = await recRes.json();
				if (Array.isArray(recData)) {
					setRecs(recData);
				}
			}

			toast.success("تم حفظ الإعدادات بنجاح");
		} catch (error: any) {
			console.error("Error saving settings:", error);
			console.error("Error details:", error?.details);
			
			let errorMessage = error?.message || "حدث خطأ أثناء حفظ الإعدادات";
			
			// Show more details in development
			if (error?.details && process.env.NODE_ENV === 'development') {
				console.error("Full error:", {
					message: errorMessage,
					details: error.details,
					stack: error.stack
				});
			}
			
			toast.error(errorMessage);
		} finally {
			setIsSaving(false);
		}
	}, [userId, wakeUpTime, sleepTime, focusStrategy, subjects]);

	const handleToggleTwoFactor = useCallback(async (enabled: boolean) => {
		if (!user?.id) {
			toast.error("لم يتم العثور على معلومات المستخدم");
			return;
		}

		const previousState = twoFactorEnabled;
		setTwoFactorEnabled(enabled);
		setIsLoading(true);
		
		try {
			const token = getTokenFromStorage();
			const headers: HeadersInit = {
				'Content-Type': 'application/json',
			};
			if (token) {
				headers['Authorization'] = `Bearer ${token}`;
			}

			const response = await fetch('/api/auth/two-factor/setup', {
				method: 'POST',
				headers,
				credentials: 'include',
				body: JSON.stringify({
					userId: user.id,
					enable: enabled,
				}),
			});

			if (!response.ok) {
				let errorMessage = 'فشل في تحديث التحقق بخطوتين';
				try {
					const errorData = await response.json();
					if (errorData.error) {
						errorMessage = errorData.error;
					}
				} catch {
					errorMessage = response.status === 401 
						? "غير مصرح - يرجى تسجيل الدخول مرة أخرى"
						: `فشل في تحديث التحقق بخطوتين (${response.status})`;
				}
				throw new Error(errorMessage);
			}

			const data = await response.json();
			toast.success(data.message || 'تم تحديث إعدادات الأمان بنجاح');
		} catch (error: any) {
			const errorMessage = error?.message || 'فشل في تحديث التحقق بخطوتين';
			toast.error(errorMessage);
			// Revert the switch if the request failed
			setTwoFactorEnabled(previousState);
		} finally {
			setIsLoading(false);
		}
	}, [user?.id, twoFactorEnabled]);

	const updateHours = useCallback((sub: SubjectType, hours: number) => {
		setSubjects((prev) => prev.map((s) => (s.subject === sub ? { ...s, targetWeeklyHours: Math.max(0, hours) } : s)));
	}, []);

	// Get subject name in Arabic
	const getSubjectName = (subject: SubjectType): string => {
		const names: Record<SubjectType, string> = {
			[SubjectType.MATH]: "الرياضيات",
			[SubjectType.PHYSICS]: "الفيزياء",
			[SubjectType.CHEMISTRY]: "الكيمياء",
			[SubjectType.ARABIC]: "اللغة العربية",
			[SubjectType.ENGLISH]: "اللغة الإنجليزية",
		};
		return names[subject] || subject;
	};

	// Get focus strategy name in Arabic
	const getFocusStrategyName = (strategy: FocusStrategy): string => {
		const names: Record<FocusStrategy, string> = {
			[FocusStrategy.POMODORO]: "Pomodoro",
			[FocusStrategy.EIGHTY_TWENTY]: "80/20",
			[FocusStrategy.DEEP_WORK]: "Deep Work",
			[FocusStrategy.TIME_BLOCKING]: "Time Blocking",
			[FocusStrategy.NO_DISTRACTION]: "No Distraction",
		};
		return names[strategy] || strategy;
	};

	if (isLoadingSettings) {
		return (
			<div className="flex justify-center items-center h-64">
				<div className="flex flex-col items-center gap-4">
					<Loader2 className="h-8 w-8 animate-spin text-primary" />
					<p className="text-sm text-muted-foreground">جاري تحميل الإعدادات...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="px-4">
			<section className="mx-auto max-w-7xl py-8 space-y-6">
				<h1 className="text-2xl md:text-3xl font-bold">الإعدادات والتخصيص</h1>

				<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
					<TabsList className="grid w-full grid-cols-5">
						<TabsTrigger value="general" className="flex items-center gap-2">
							<UserIcon className="h-4 w-4" />
							<span className="hidden sm:inline">الإعدادات العامة</span>
						</TabsTrigger>
						<TabsTrigger value="security" className="flex items-center gap-2">
							<ShieldIcon className="h-4 w-4" />
							<span className="hidden sm:inline">الأمان</span>
						</TabsTrigger>
						<TabsTrigger value="notifications" className="flex items-center gap-2">
							<BellIcon className="h-4 w-4" />
							<span className="hidden sm:inline">الإشعارات</span>
						</TabsTrigger>
						<TabsTrigger value="appearance" className="flex items-center gap-2">
							<PaletteIcon className="h-4 w-4" />
							<span className="hidden sm:inline">المظهر</span>
						</TabsTrigger>
						<TabsTrigger value="language" className="flex items-center gap-2">
							<GlobeIcon className="h-4 w-4" />
							<span className="hidden sm:inline">اللغة</span>
						</TabsTrigger>
					</TabsList>

					<TabsContent value="general" className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle>أوقات اليوم</CardTitle>
								<CardDescription>حدد أوقات الاستيقاظ والنوم لتحسين جدول دراستك</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="wakeUpTime">وقت الاستيقاظ</Label>
										<Input
											id="wakeUpTime"
											type="time"
											value={wakeUpTime}
											onChange={(e) => setWakeUpTime(e.target.value)}
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="sleepTime">وقت النوم</Label>
										<Input
											id="sleepTime"
											type="time"
											value={sleepTime}
											onChange={(e) => setSleepTime(e.target.value)}
										/>
									</div>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>استراتيجية التركيز</CardTitle>
								<CardDescription>اختر الطريقة التي تساعدك على التركيز أثناء الدراسة</CardDescription>
							</CardHeader>
							<CardContent>
								<Select value={focusStrategy} onValueChange={(value) => setFocusStrategy(value as FocusStrategy)}>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="اختر استراتيجية التركيز" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value={FocusStrategy.POMODORO}>Pomodoro</SelectItem>
										<SelectItem value={FocusStrategy.EIGHTY_TWENTY}>80/20</SelectItem>
										<SelectItem value={FocusStrategy.DEEP_WORK}>Deep Work</SelectItem>
										<SelectItem value={FocusStrategy.TIME_BLOCKING}>Time Blocking</SelectItem>
										<SelectItem value={FocusStrategy.NO_DISTRACTION}>No Distraction</SelectItem>
									</SelectContent>
								</Select>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>المواد وساعات الأسبوع</CardTitle>
								<CardDescription>حدد عدد الساعات التي تخطط لدراستها كل أسبوع لكل مادة</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
									{subjects.map((s) => (
										<div key={s.subject} className="flex items-center justify-between gap-2 border rounded-md px-3 py-2">
											<Label className="font-medium">{getSubjectName(s.subject)}</Label>
											<Input
												type="number"
												min={0}
												className="w-24"
												value={s.targetWeeklyHours}
												onChange={(e) => updateHours(s.subject, Number(e.target.value))}
											/>
										</div>
									))}
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>التوصيات الذكية</CardTitle>
								<CardDescription>اقتراحات مخصصة لتحسين أسلوب دراستك</CardDescription>
							</CardHeader>
							<CardContent>
								{Array.isArray(recs) && recs.length > 0 ? (
									<ul className="list-disc pr-5 text-sm space-y-2">
										{recs.map((r, i) => (
											<li key={i}>
												<span className="font-medium">{r.title}:</span>{" "}
												<span className="text-muted-foreground">{r.message}</span>
											</li>
										))}
									</ul>
								) : (
									<p className="text-sm text-muted-foreground">لا توجد توصيات متاحة حالياً</p>
								)}
							</CardContent>
						</Card>

						<div className="flex justify-end">
							<Button onClick={saveGeneralSettings} disabled={isSaving}>
								{isSaving ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										جاري الحفظ...
									</>
								) : (
									"حفظ الإعدادات"
								)}
							</Button>
						</div>
					</TabsContent>

					<TabsContent value="security" className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle>التحقق بخطوتين</CardTitle>
								<CardDescription>
									أضف طبقة أمان إضافية إلى حسابك عند تسجيل الدخول
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<Label htmlFor="two-factor">التحقق بخطوتين</Label>
										<p className="text-sm text-muted-foreground">
											سيتم إرسال رمز إلى بريدك الإلكتروني عند تسجيل الدخول
										</p>
									</div>
									<Switch
										id="two-factor"
										checked={twoFactorEnabled}
										onCheckedChange={handleToggleTwoFactor}
										disabled={isLoading}
									/>
								</div>

								{twoFactorEnabled && (
									<div className="rounded-lg bg-muted p-4">
										<h4 className="font-medium mb-2">كيف يعمل التحقق بخطوتين:</h4>
										<ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
											<li>عند تسجيل الدخول، ستتم مطالبتك بإدخال كلمة المرور الخاصة بك</li>
											<li>بعد إدخال كلمة المرور الصحيحة، سيتم إرسال رمز إلى بريدك الإلكتروني</li>
											<li>أدخل الرمز لإكمال تسجيل الدخول</li>
										</ol>
									</div>
								)}
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>أجهزة تسجيل الدخول النشطة</CardTitle>
								<CardDescription>
									أجهزةك المسجلة حالياً
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									<div className="flex items-center justify-between p-3 border rounded-lg">
										<div>
											<p className="font-medium">هذا الجهاز</p>
											<p className="text-sm text-muted-foreground">آخر نشاط: اليوم</p>
										</div>
										<Button variant="outline" size="sm">تسجيل الخروج</Button>
									</div>
								</div>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="notifications" className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle>الإشعارات</CardTitle>
								<CardDescription>إدارة أنواع الإشعارات التي تتلقاها</CardDescription>
							</CardHeader>
							<CardContent className="space-y-6">
								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<Label htmlFor="task-reminders">إشعارات المهام</Label>
										<p className="text-sm text-muted-foreground">
											تلقي إشعارات عند اقتراب موعد تسليم المهام
										</p>
									</div>
									<Switch
										id="task-reminders"
										checked={taskReminders}
										onCheckedChange={setTaskReminders}
									/>
								</div>

								<Separator />

								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<Label htmlFor="exam-reminders">إشعارات الامتحانات</Label>
										<p className="text-sm text-muted-foreground">
											تلقي إشعارات قبل الامتحانات بـ 24 ساعة
										</p>
									</div>
									<Switch
										id="exam-reminders"
										checked={examReminders}
										onCheckedChange={setExamReminders}
									/>
								</div>

								<Separator />

								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<Label htmlFor="progress-reports">إشعارات التقدم</Label>
										<p className="text-sm text-muted-foreground">
											تلقي تقارير أسبوعية عن تقدمك الدراسي
										</p>
									</div>
									<Switch
										id="progress-reports"
										checked={progressReports}
										onCheckedChange={setProgressReports}
									/>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>الرسائل النصية</CardTitle>
								<CardDescription>تلقي إشعارات عبر الرسائل النصية</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<Label htmlFor="sms-notifications">تمكين الرسائل النصية</Label>
										<p className="text-sm text-muted-foreground">
											تلقي إشعارات مهمة عبر الرسائل النصية
										</p>
									</div>
									<Switch
										id="sms-notifications"
										checked={smsNotifications}
										onCheckedChange={setSmsNotifications}
									/>
								</div>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="appearance" className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle>المظهر</CardTitle>
								<CardDescription>تخصيص مظهر التطبيق</CardDescription>
							</CardHeader>
							<CardContent className="space-y-6">
								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<Label htmlFor="dark-mode">الوضع الليلي</Label>
										<p className="text-sm text-muted-foreground">
											تفعيل الوضع الليلي لتقليل إجهاد العين
										</p>
									</div>
									<Switch
										id="dark-mode"
										checked={darkMode}
										onCheckedChange={setDarkMode}
									/>
								</div>

								<Separator />

								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<Label htmlFor="font-size">حجم الخط</Label>
										<p className="text-sm text-muted-foreground">
											تعديل حجم الخط لسهولة القراءة
										</p>
									</div>
									<Select value={fontSize} onValueChange={setFontSize}>
										<SelectTrigger className="w-32">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="small">صغير</SelectItem>
											<SelectItem value="medium">متوسط</SelectItem>
											<SelectItem value="large">كبير</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<Separator />

								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<Label htmlFor="primary-color">اللون الرئيسي</Label>
										<p className="text-sm text-muted-foreground">
											اختيار اللون الرئيسي للتطبيق
										</p>
									</div>
									<Select value={primaryColor} onValueChange={setPrimaryColor}>
										<SelectTrigger className="w-32">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="blue">أزرق</SelectItem>
											<SelectItem value="green">أخضر</SelectItem>
											<SelectItem value="purple">بنفسجي</SelectItem>
											<SelectItem value="red">أحمر</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="language" className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle>اللغة</CardTitle>
								<CardDescription>اختيار اللغة المفضلة للتطبيق</CardDescription>
							</CardHeader>
							<CardContent className="space-y-6">
								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<Label htmlFor="app-language">لغة التطبيق</Label>
										<p className="text-sm text-muted-foreground">
											اختر اللغة التي تريد استخدامها في التطبيق
										</p>
									</div>
									<Select value={language} onValueChange={setLanguage}>
										<SelectTrigger className="w-32">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="ar">العربية</SelectItem>
											<SelectItem value="en">English</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<Separator />

								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<Label htmlFor="timezone">المنطقة الزمنية</Label>
										<p className="text-sm text-muted-foreground">
											اختر منطقتك الزمنية الصحيحة
										</p>
									</div>
									<Select value={timezone} onValueChange={setTimezone}>
										<SelectTrigger className="w-32">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="ast">توقيت Arabia Standard</SelectItem>
											<SelectItem value="utc">توقيت UTC</SelectItem>
											<SelectItem value="est">توقيت Eastern</SelectItem>
											<SelectItem value="pst">توقيت Pacific</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<Separator />

								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<Label htmlFor="date-format">تنسيق التاريخ</Label>
										<p className="text-sm text-muted-foreground">
											اختر تنسيق التاريخ المفضل
										</p>
									</div>
									<Select value={dateFormat} onValueChange={setDateFormat}>
										<SelectTrigger className="w-32">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="hijri">هجري</SelectItem>
											<SelectItem value="gregorian">ميلادي</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</section>
		</div>
	);
}
