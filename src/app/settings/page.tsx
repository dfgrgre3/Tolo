"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/shared/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/shared/badge";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/UserProvider";
import { User as UserIcon, Shield as ShieldIcon, Bell as BellIcon, Palette as PaletteIcon, Globe as GlobeIcon } from "lucide-react";
import { SettingsData, SettingsApiResponse, SubjectEnrollment, UserSettings, FocusStrategy, SubjectType } from "@/types/settings";

const LOCAL_USER_KEY = "tw_user_id";
async function ensureUser(): Promise<string> {
	let id = localStorage.getItem(LOCAL_USER_KEY);
	if (!id) {
		const res = await fetch("/api/users/guest", { method: "POST" });
		const data = await res.json();
		id = data.id;
		localStorage.setItem(LOCAL_USER_KEY, id!);
	}
	return id!;
}

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

	useEffect(() => {
		ensureUser().then((id) => setUserId(id));
	}, []);

	useEffect(() => {
		if (!userId) return;
		(async () => {
			const res = await fetch(`/api/settings?userId=${userId}`);
			const data: SettingsData = await res.json();
			if (data.user) {
				setWakeUpTime(data.user.wakeUpTime ?? "");
				setSleepTime(data.user.sleepTime ?? "");
				setFocusStrategy((data.user.focusStrategy as FocusStrategy) ?? FocusStrategy.POMODORO);
			}
			if (data.subjects?.length) setSubjects(data.subjects);
			const recRes = await fetch(`/api/recommendations?userId=${userId}`);
			try {
				const recData = await recRes.json();
				console.log("Recommendations data:", recData); // للتصحيح
				// Ensure we're always setting an array
				if (Array.isArray(recData)) {
					setRecs(recData);
				} else if (recData && typeof recData === 'object' && 'error' in recData) {
					// Handle error response
					console.error("Error fetching recommendations:", recData.error);
					setRecs([]);
				} else {
					// Handle unexpected response format
					console.error("Unexpected recommendations format:", recData);
					setRecs([]);
				}
			} catch (error) {
				console.error("Error parsing recommendations:", error);
				setRecs([]);
			}
		})();
	}, [userId]);

	useEffect(() => {
		if (user) {
			setTwoFactorEnabled(user.twoFactorEnabled || false);
			setIsLoading(false);
		}
	}, [user]);

	async function saveGeneralSettings() {
		if (!userId) return;
		await fetch("/api/settings", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ userId, wakeUpTime: wakeUpTime || null, sleepTime: sleepTime || null, focusStrategy, subjects }),
		});
		const recRes = await fetch(`/api/recommendations?userId=${userId}`);
		try {
			const recData = await recRes.json();
			console.log("Recommendations data after save:", recData); // للتصحيح
			// Ensure we're always setting an array
			if (Array.isArray(recData)) {
				setRecs(recData);
			} else if (recData && typeof recData === 'object' && 'error' in recData) {
				// Handle error response
				console.error("Error fetching recommendations:", recData.error);
				setRecs([]);
			} else {
				// Handle unexpected response format
				console.error("Unexpected recommendations format:", recData);
				setRecs([]);
			}
			toast.success("تم حفظ الإعدادات بنجاح");
		} catch (error) {
			console.error("Error parsing recommendations after save:", error);
			setRecs([]);
			toast.error("حدث خطأ أثناء حفظ الإعدادات");
		}
	}

	const handleToggleTwoFactor = async (enabled: boolean) => {
		setIsLoading(true);
		try {
			const response = await fetch('/api/auth/two-factor/setup', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					userId: user?.id,
					enable: enabled,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to update two-factor authentication');
			}

			setTwoFactorEnabled(enabled);
			toast.success(data.message);
		} catch (error: any) {
			toast.error(error.message || 'Failed to update two-factor authentication');
			// Revert the switch if the request failed
			setTwoFactorEnabled(!enabled);
		} finally {
			setIsLoading(false);
		}
	};

	function updateHours(sub: SubjectType, hours: number) {
		setSubjects((prev) => prev.map((s) => (s.subject === sub ? { ...s, targetWeeklyHours: hours } : s)));
	}

	return (
		<div className="px-4">
			<section className="mx-auto max-w-7xl py-8 space-y-6">
				<h1 className="text-2xl md:text-3xl font-bold">الإعدادات والتخصيص</h1>

				<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
					<TabsList className="grid w-full grid-cols-5">
						<TabsTrigger value="general" className="flex items-center gap-2">
							<UserIcon className="h-4 w-4" />
							<span>الإعدادات العامة</span>
						</TabsTrigger>
						<TabsTrigger value="security" className="flex items-center gap-2">
							<ShieldIcon className="h-4 w-4" />
							<span>الأمان</span>
						</TabsTrigger>
						<TabsTrigger value="notifications" className="flex items-center gap-2">
							<BellIcon className="h-4 w-4" />
							<span>الإشعارات</span>
						</TabsTrigger>
						<TabsTrigger value="appearance" className="flex items-center gap-2">
							<PaletteIcon className="h-4 w-4" />
							<span>المظهر</span>
						</TabsTrigger>
						<TabsTrigger value="language" className="flex items-center gap-2">
							<GlobeIcon className="h-4 w-4" />
							<span>اللغة</span>
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
										<input
											id="wakeUpTime"
											type="time"
											className="w-full border rounded-md px-3 py-2 text-sm"
											value={wakeUpTime}
											onChange={(e) => setWakeUpTime(e.target.value)}
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="sleepTime">وقت النوم</Label>
										<input
											id="sleepTime"
											type="time"
											className="w-full border rounded-md px-3 py-2 text-sm"
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
								<select
									className="w-full border rounded-md px-3 py-2 text-sm"
									aria-label="اختر استراتيجية التركيز"
									value={focusStrategy}
									onChange={(e) => setFocusStrategy(e.target.value)}
								>
									<option value="POMODORO">Pomodoro</option>
									<option value="EIGHTY_TWENTY">80/20</option>
									<option value="DEEP_WORK">Deep Work</option>
									<option value="TIME_BLOCKING">Time Blocking</option>
									<option value="NO_DISTRACTION">No Distraction</option>
								</select>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>المواد وساعات الأسبوع</CardTitle>
								<CardDescription>حدد عدد الساعات التي تخطط لدراستها كل أسبوع لكل مادة</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
									{subjects.map((s) => (
										<div key={s.subject} className="flex items-center justify-between gap-2 border rounded-md px-3 py-2">
											<span>{s.subject}</span>
											<input
												type="number"
												min={0}
												className="w-24 border rounded-md px-2 py-1"
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
									<ul className="list-disc pr-5 text-sm space-y-1">
										{recs.map((r, i) => (
											<li key={i}><span className="font-medium">{r.title}:</span> <span className="text-muted-foreground">{r.message}</span></li>
										))}
									</ul>
								) : (
									<p className="text-sm text-muted-foreground">لا توجد توصيات متاحة حالياً</p>
								)}
							</CardContent>
						</Card>

						<div className="flex justify-end">
							<Button onClick={saveGeneralSettings}>حفظ الإعدادات</Button>
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
									<div>
										<Label>التحقق بخطوتين</Label>
										<p className="text-sm text-muted-foreground">
											سيتم إرسال رمز إلى بريدك الإلكتروني عند تسجيل الدخول
										</p>
									</div>
									<div className="relative inline-block w-10 mr-2 align-middle select-none">
										<input 
											type="checkbox" 
											name="toggle"
											id="toggle"
											checked={twoFactorEnabled}
											onChange={(e) => handleToggleTwoFactor(e.target.checked)}
											disabled={isLoading}
											className="sr-only"
										/>
										<div className={`block w-10 h-6 rounded-full ${twoFactorEnabled ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
										<div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${twoFactorEnabled ? 'transform translate-x-4' : ''}`}></div>
									</div>
								</div>

								{twoFactorEnabled && (
									<div className="rounded-lg bg-muted p-4">
										<h4 className="font-medium">كيف يعمل التحقق بخطوتين:</h4>
										<ol className="mt-2 list-decimal list-inside space-y-1 text-sm text-muted-foreground">
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
							<CardContent className="space-y-4">
								<div className="flex items-center justify-between">
									<div>
										<Label>إشعارات المهام</Label>
										<p className="text-sm text-muted-foreground">
											تلقي إشعارات عند اقتراب موعد تسليم المهام
										</p>
									</div>
									<div className="relative inline-block w-10 mr-2 align-middle select-none">
										<input 
											type="checkbox" 
											name="toggle"
											id="toggle"
											defaultChecked
											className="sr-only"
										/>
										<div className="block w-10 h-6 rounded-full bg-blue-500"></div>
										<div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform transform translate-x-4"></div>
									</div>
								</div>

								<div className="flex items-center justify-between">
									<div>
										<Label>إشعارات الامتحانات</Label>
										<p className="text-sm text-muted-foreground">
											تلقي إشعارات قبل الامتحانات بـ 24 ساعة
										</p>
									</div>
									<div className="relative inline-block w-10 mr-2 align-middle select-none">
										<input 
											type="checkbox" 
											name="toggle"
											id="toggle"
											defaultChecked
											className="sr-only"
										/>
										<div className="block w-10 h-6 rounded-full bg-blue-500"></div>
										<div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform transform translate-x-4"></div>
									</div>
								</div>

								<div className="flex items-center justify-between">
									<div>
										<Label>إشعارات التقدم</Label>
										<p className="text-sm text-muted-foreground">
											تلقي تقارير أسبوعية عن تقدمك الدراسي
										</p>
									</div>
									<div className="relative inline-block w-10 mr-2 align-middle select-none">
										<input 
											type="checkbox" 
											name="toggle"
											id="toggle"
											className="sr-only"
										/>
										<div className="block w-10 h-6 rounded-full bg-gray-300"></div>
										<div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform"></div>
									</div>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>الرسائل النصية</CardTitle>
								<CardDescription>تلقي إشعارات عبر الرسائل النصية</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex items-center justify-between">
									<div>
										<Label>تمكين الرسائل النصية</Label>
										<p className="text-sm text-muted-foreground">
											تلقي إشعارات مهمة عبر الرسائل النصية
										</p>
									</div>
									<div className="relative inline-block w-10 mr-2 align-middle select-none">
										<input 
											type="checkbox" 
											name="toggle"
											id="toggle"
											className="sr-only"
										/>
										<div className="block w-10 h-6 rounded-full bg-gray-300"></div>
										<div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform"></div>
									</div>
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
							<CardContent className="space-y-4">
								<div className="flex items-center justify-between">
									<div>
										<Label>الوضع الليلي</Label>
										<p className="text-sm text-muted-foreground">
											تفعيل الوضع الليلي لتقليل إجهاد العين
										</p>
									</div>
									<div className="relative inline-block w-10 mr-2 align-middle select-none">
										<input 
											type="checkbox" 
											name="toggle"
											id="toggle"
											className="sr-only"
										/>
										<div className="block w-10 h-6 rounded-full bg-gray-300"></div>
										<div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform"></div>
									</div>
								</div>

								<div className="flex items-center justify-between">
									<div>
										<Label>حجم الخط</Label>
										<p className="text-sm text-muted-foreground">
											تعديل حجم الخط لسهولة القراءة
										</p>
									</div>
									<Select defaultValue="medium">
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

								<div className="flex items-center justify-between">
									<div>
										<Label>اللون الرئيسي</Label>
										<p className="text-sm text-muted-foreground">
											اختيار اللون الرئيسي للتطبيق
										</p>
									</div>
									<Select defaultValue="blue">
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
							<CardContent className="space-y-4">
								<div className="flex items-center justify-between">
									<div>
										<Label>لغة التطبيق</Label>
										<p className="text-sm text-muted-foreground">
											اختر اللغة التي تريد استخدامها في التطبيق
										</p>
									</div>
									<Select defaultValue="ar">
										<SelectTrigger className="w-32">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="ar">العربية</SelectItem>
											<SelectItem value="en">English</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<div className="flex items-center justify-between">
									<div>
										<Label>المنطقة الزمنية</Label>
										<p className="text-sm text-muted-foreground">
											اختر منطقتك الزمنية الصحيحة
										</p>
									</div>
									<Select defaultValue="ast">
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

								<div className="flex items-center justify-between">
									<div>
										<Label>تنسيق التاريخ</Label>
										<p className="text-sm text-muted-foreground">
											اختر تنسيق التاريخ المفضل
										</p>
									</div>
									<Select defaultValue="hijri">
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
