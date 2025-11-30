"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useUnifiedAuth } from "@/contexts/auth-context";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { User as UserIcon, Shield as ShieldIcon, Bell as BellIcon, Palette as PaletteIcon, Globe as GlobeIcon, Clock as ClockIcon, Loader2, Copy, Check } from "lucide-react";
import { SettingsData, SubjectEnrollment, FocusStrategy, SubjectType } from "@/types/settings";
import { ensureUser } from "@/lib/user-utils";
import TimeSettings from "@/app/time/components/TimeSettings";
import PasskeyManagement from "@/components/auth/passkeys/PasskeyManagement";
import { logger } from '@/lib/logger';
import Image from "next/image";

function SettingsPage() {
	const { user } = useUnifiedAuth();
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
	
	// 2FA Setup State
	const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
	const [qrCodeUrl, setQrCodeUrl] = useState("");
	const [secret, setSecret] = useState("");
	const [verificationCode, setVerificationCode] = useState("");
	const [isVerifying, setIsVerifying] = useState(false);
	const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
	const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
	const [copied, setCopied] = useState(false);

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
				const res = await fetch(`/api/settings?userId=${userId}`, {
					headers: { 'Content-Type': 'application/json' },
					credentials: "include",
				});
				
				if (!res.ok) throw new Error("فشل في تحميل الإعدادات");
				
				const data: SettingsData = await res.json();
				if (data.user) {
					setWakeUpTime(data.user.wakeUpTime ?? "");
					setSleepTime(data.user.sleepTime ?? "");
					setFocusStrategy((data.user.focusStrategy as FocusStrategy) ?? FocusStrategy.POMODORO);
					setTwoFactorEnabled(data.user.twoFactorEnabled ?? false);
				}
				if (data.subjects?.length) setSubjects(data.subjects);
				
				const recRes = await fetch(`/api/recommendations?userId=${userId}`, {
					headers: { 'Content-Type': 'application/json' },
					credentials: "include",
				});
				if (recRes.ok) {
					const recData = await recRes.json();
					setRecs(Array.isArray(recData) ? recData : []);
				}
			} catch (error: any) {
				logger.error("Error fetching settings:", error);
				toast.error(error?.message || "فشل في تحميل الإعدادات");
			} finally {
				setIsLoadingSettings(false);
			}
		};

		fetchSettings();
	}, [userId]);

	useEffect(() => {
		if (user) setIsLoading(false);
	}, [user]);

	const saveGeneralSettings = useCallback(async () => {
		if (!userId) return;
		setIsSaving(true);
		try {
			const response = await fetch("/api/settings", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ 
					userId, 
					wakeUpTime: wakeUpTime || null, 
					sleepTime: sleepTime || null, 
					focusStrategy, 
					subjects 
				}),
			});

			if (!response.ok) throw new Error("فشل في حفظ الإعدادات");
			toast.success("تم حفظ الإعدادات بنجاح");
		} catch (error: any) {
			toast.error(error?.message || "حدث خطأ أثناء حفظ الإعدادات");
		} finally {
			setIsSaving(false);
		}
	}, [userId, wakeUpTime, sleepTime, focusStrategy, subjects]);

	const handleToggleTwoFactor = useCallback(async (enabled: boolean) => {
		if (!user?.id) return;

		if (!enabled) {
			// Disable 2FA
			setIsLoading(true);
			try {
				const response = await fetch('/api/auth/two-factor/setup', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ userId: user.id, enable: false }),
				});

				if (!response.ok) throw new Error('فشل في تعطيل التحقق بخطوتين');
				setTwoFactorEnabled(false);
				toast.success('تم تعطيل التحقق بخطوتين');
			} catch (error) {
				toast.error('فشل في تعطيل التحقق بخطوتين');
			} finally {
				setIsLoading(false);
			}
			return;
		}

		// Enable 2FA - Start Setup
		setIsLoading(true);
		try {
			const response = await fetch('/api/auth/two-factor/totp/setup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
			});

			if (!response.ok) throw new Error('فشل في بدء إعداد التحقق بخطوتين');
			
			const data = await response.json();
			setQrCodeUrl(data.qrCodeURL);
			setSecret(data.secret);
			setShowTwoFactorSetup(true);
		} catch (error) {
			toast.error('فشل في بدء إعداد التحقق بخطوتين');
		} finally {
			setIsLoading(false);
		}
	}, [user?.id]);

	const verifyTwoFactor = async () => {
		if (!verificationCode || verificationCode.length !== 6) {
			toast.error('يرجى إدخال رمز صحيح مكون من 6 أرقام');
			return;
		}

		setIsVerifying(true);
		try {
			const response = await fetch('/api/auth/two-factor/totp/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code: verificationCode }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'رمز التحقق غير صحيح');
			}

			setTwoFactorEnabled(true);
			setShowTwoFactorSetup(false);
			setRecoveryCodes(data.recoveryCodes || []);
			setShowRecoveryCodes(true);
			toast.success('تم تفعيل التحقق بخطوتين بنجاح');
		} catch (error: any) {
			toast.error(error.message);
		} finally {
			setIsVerifying(false);
			setVerificationCode("");
		}
	};

	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
		toast.success('تم النسخ إلى الحافظة');
	};

	const updateHours = useCallback((sub: SubjectType, hours: number) => {
		setSubjects((prev) => prev.map((s) => (s.subject === sub ? { ...s, targetWeeklyHours: Math.max(0, hours) } : s)));
	}, []);

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
					<TabsList className="grid w-full grid-cols-3 md:grid-cols-6 gap-1">
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
						<TabsTrigger value="time" className="flex items-center gap-2">
							<ClockIcon className="h-4 w-4" />
							<span className="hidden sm:inline">إعدادات الوقت</span>
						</TabsTrigger>
					</TabsList>

					<TabsContent value="general" className="space-y-6">
						{/* General Settings Content */}
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
											استخدم تطبيق المصادقة (مثل Google Authenticator) لتوليد رموز الدخول
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
									<div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-4 border border-green-200 dark:border-green-800">
										<div className="flex items-center gap-2 text-green-700 dark:text-green-400">
											<ShieldIcon className="h-5 w-5" />
											<h4 className="font-medium">التحقق بخطوتين مفعل</h4>
										</div>
										<p className="text-sm text-green-600 dark:text-green-500 mt-1">
											حسابك محمي الآن بطبقة أمان إضافية.
										</p>
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

						<Card>
							<CardHeader>
								<CardTitle>إدارة مفاتيح المرور</CardTitle>
								<CardDescription>
									إدارة مفاتيح المرور الخاصة بك لتسجيل الدخول بدون كلمة مرور.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<PasskeyManagement />
							</CardContent>
						</Card>
					</TabsContent>

					{/* Other tabs content (notifications, appearance, etc.) - kept as is */}
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
										<p className="text-sm text-muted-foreground">تلقي إشعارات عند اقتراب موعد تسليم المهام</p>
									</div>
									<Switch id="task-reminders" checked={taskReminders} onCheckedChange={setTaskReminders} />
								</div>
								<Separator />
								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<Label htmlFor="exam-reminders">إشعارات الامتحانات</Label>
										<p className="text-sm text-muted-foreground">تلقي إشعارات قبل الامتحانات بـ 24 ساعة</p>
									</div>
									<Switch id="exam-reminders" checked={examReminders} onCheckedChange={setExamReminders} />
								</div>
								<Separator />
								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<Label htmlFor="progress-reports">إشعارات التقدم</Label>
										<p className="text-sm text-muted-foreground">تلقي تقارير أسبوعية عن تقدمك الدراسي</p>
									</div>
									<Switch id="progress-reports" checked={progressReports} onCheckedChange={setProgressReports} />
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
										<p className="text-sm text-muted-foreground">تفعيل الوضع الليلي لتقليل إجهاد العين</p>
									</div>
									<Switch id="dark-mode" checked={darkMode} onCheckedChange={setDarkMode} />
								</div>
								<Separator />
								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<Label htmlFor="font-size">حجم الخط</Label>
										<p className="text-sm text-muted-foreground">تعديل حجم الخط لسهولة القراءة</p>
									</div>
									<Select value={fontSize} onValueChange={setFontSize}>
										<SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
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
										<p className="text-sm text-muted-foreground">اختيار اللون الرئيسي للتطبيق</p>
									</div>
									<Select value={primaryColor} onValueChange={setPrimaryColor}>
										<SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
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
										<p className="text-sm text-muted-foreground">اختر اللغة التي تريد استخدامها في التطبيق</p>
									</div>
									<Select value={language} onValueChange={setLanguage}>
										<SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
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
										<p className="text-sm text-muted-foreground">اختر منطقتك الزمنية الصحيحة</p>
									</div>
									<Select value={timezone} onValueChange={setTimezone}>
										<SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
										<SelectContent>
											<SelectItem value="ast">توقيت Arabia Standard</SelectItem>
											<SelectItem value="utc">توقيت UTC</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<Separator />
								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<Label htmlFor="date-format">تنسيق التاريخ</Label>
										<p className="text-sm text-muted-foreground">اختر تنسيق التاريخ المفضل</p>
									</div>
									<Select value={dateFormat} onValueChange={setDateFormat}>
										<SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
										<SelectContent>
											<SelectItem value="hijri">هجري</SelectItem>
											<SelectItem value="gregorian">ميلادي</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="time" className="space-y-6">
						<TimeSettings />
					</TabsContent>
				</Tabs>
			</section>

			{/* 2FA Setup Modal */}
			<Dialog open={showTwoFactorSetup} onOpenChange={setShowTwoFactorSetup}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>إعداد التحقق بخطوتين</DialogTitle>
						<DialogDescription>
							امسح رمز QR باستخدام تطبيق المصادقة (مثل Google Authenticator) وأدخل الرمز الظاهر.
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col items-center space-y-4 py-4">
						{qrCodeUrl && (
							<div className="bg-white p-2 rounded-lg border">
								<Image src={qrCodeUrl} alt="QR Code" width={200} height={200} />
							</div>
						)}
						<div className="w-full space-y-2">
							<Label>أو أدخل المفتاح يدوياً:</Label>
							<div className="flex items-center gap-2">
								<code className="flex-1 p-2 bg-muted rounded text-center font-mono text-sm">{secret}</code>
								<Button size="icon" variant="outline" onClick={() => copyToClipboard(secret)}>
									{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
								</Button>
							</div>
						</div>
						<div className="w-full space-y-2">
							<Label htmlFor="verification-code">رمز التحقق</Label>
							<Input
								id="verification-code"
								placeholder="000000"
								className="text-center text-lg tracking-widest"
								maxLength={6}
								value={verificationCode}
								onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowTwoFactorSetup(false)}>إلغاء</Button>
						<Button onClick={verifyTwoFactor} disabled={isVerifying || verificationCode.length !== 6}>
							{isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "تفعيل"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Recovery Codes Modal */}
			<Dialog open={showRecoveryCodes} onOpenChange={setShowRecoveryCodes}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>رموز الاسترداد</DialogTitle>
						<DialogDescription>
							احتفظ بهذه الرموز في مكان آمن. يمكنك استخدامها لتسجيل الدخول إذا فقدت الوصول إلى هاتفك.
						</DialogDescription>
					</DialogHeader>
					<div className="grid grid-cols-2 gap-2 py-4">
						{recoveryCodes.map((code, index) => (
							<code key={index} className="p-2 bg-muted rounded text-center font-mono text-sm">
								{code}
							</code>
						))}
					</div>
					<DialogFooter>
						<Button onClick={() => {
							const codes = recoveryCodes.join('\n');
							copyToClipboard(codes);
						}}>
							نسخ الرموز
						</Button>
						<Button onClick={() => setShowRecoveryCodes(false)}>تم</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

const SettingsPageWithAuth = () => {
	return (
		<AuthGuard>
			<SettingsPage />
		</AuthGuard>
	);
};

export default SettingsPageWithAuth;
