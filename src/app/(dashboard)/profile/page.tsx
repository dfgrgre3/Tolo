"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
	User,
	Mail,
	Calendar,
	School,
	Edit,
	Save,
	X,
	Camera,
	CheckCircle2,
	Clock,
	BookOpen,
	FileText,
	MessageSquare,
	Award,
	TrendingUp,
	Activity,
	Sparkles,
	BarChart3,
} from "lucide-react";
import { ensureUser } from "@/lib/user-utils";
import SecurityTab from "./components/SecurityTab";

import { logger } from '@/lib/logger';

type ProfileUser = {
	id: string;
	name: string;
	email: string;
	avatar?: string;
	bio?: string;
	grade?: string;
	school?: string;
	createdAt: string;
};

type UserStats = {
	completedTasks: number;
	totalStudyTime: number; // in minutes
	coursesEnrolled: number;
	examsTaken: number;
	forumPosts: number;
	blogPosts: number;
	studyStreak?: number;
	achievementsCount?: number;
};

export default function ProfilePage() {
	const router = useRouter();
	const [userId, setUserId] = useState<string | null>(null);
	const [user, setUser] = useState<ProfileUser | null>(null);
	const [stats, setStats] = useState<UserStats | null>(null);
	const [loading, setLoading] = useState(true);
	const [isEditing, setIsEditing] = useState(false);
	const [activeTab, setActiveTab] = useState("overview");
	const [isSaving, setIsSaving] = useState(false);
	const [editForm, setEditForm] = useState({
		name: "",
		email: "",
		bio: "",
		grade: "",
		school: "",
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
			}
		};

		const fetchUserStats = async () => {
			try {
				const res = await fetch(`/api/users/${userId}/stats`);
				if (res.ok) {
					const statsData = await res.json();
					setStats(statsData);
				}
			} catch (error) {
				logger.error("Error fetching user stats:", error);
			}
		};

		const loadData = async () => {
			setLoading(true);
			await Promise.all([fetchUserData(), fetchUserStats()]);
			setLoading(false);
		};

		loadData();
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
			} else {
				const errorData = await res.json().catch(() => ({ error: "حدث خطأ غير معروف" }));
				alert(errorData.error || "حدث خطأ أثناء تحديث الملف الشخصي");
			}
		} catch (error) {
			logger.error("Error updating user profile:", error);
			alert("حدث خطأ أثناء تحديث الملف الشخصي");
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
			} else {
				alert("حدث خطأ أثناء رفع الصورة");
			}
		} catch (error) {
			logger.error("Error uploading avatar:", error);
			alert("حدث خطأ أثناء رفع الصورة");
		}
	};

	return (
		<AuthGuard>
			{loading ? (
				<div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
					<div className="text-center space-y-4">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
						<p className="text-lg font-medium text-muted-foreground">جاري تحميل الملف الشخصي...</p>
					</div>
				</div>
			) : !user ? (
				<div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
					<Card className="max-w-md shadow-xl border-2">
						<CardContent className="pt-6 text-center space-y-4">
							<User className="h-16 w-16 text-muted-foreground mx-auto" />
							<div>
								<h3 className="text-lg font-semibold">المستخدم غير موجود</h3>
								<p className="text-muted-foreground">لم يتم العثور على ملفك الشخصي</p>
							</div>
							<Button onClick={() => router.push("/")}>العودة للصفحة الرئيسية</Button>
						</CardContent>
					</Card>
				</div>
			) : (
				<div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
					<div className="container mx-auto px-4 py-8 max-w-6xl">
			{/* Header Section */}
			<motion.div 
				className="mb-8 space-y-2"
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
			>
				<h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
					الملف الشخصي
				</h1>
				<p className="text-muted-foreground text-lg">إدارة معلوماتك الشخصية ومتابعة تقدمك الأكاديمي</p>
			</motion.div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Profile Card - Enhanced */}
				<div className="lg:col-span-1 space-y-6">
					<Card className="overflow-hidden shadow-xl border-2 border-primary/10">
						<div className="h-32 bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 relative overflow-hidden">
							<div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />
							<div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
								<Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30">
									<Sparkles className="h-3 w-3 mr-1" />
									عضو نشط
								</Badge>
							</div>
						</div>
						<CardContent className="p-6 pt-0">
							<div className="flex flex-col items-center -mt-16">
								<motion.div 
									className="relative mb-4"
									whileHover={{ scale: 1.05 }}
									transition={{ type: "spring", stiffness: 300 }}
								>
									<Avatar className="w-28 h-28 border-4 border-background shadow-2xl ring-4 ring-primary/20">
										<AvatarImage src={user.avatar} alt={user.name} />
										<AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
											{user.name.charAt(0).toUpperCase()}
										</AvatarFallback>
									</Avatar>
									<label
										htmlFor="avatar-upload"
										className="absolute bottom-0 right-0 bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-full p-3 cursor-pointer shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 ring-2 ring-background"
										title="رفع صورة شخصية جديدة"
									>
										<Camera className="h-5 w-5" />
										<span className="sr-only">رفع صورة شخصية جديدة</span>
									</label>
									<input
										id="avatar-upload"
										type="file"
										className="hidden"
										accept="image/*"
										onChange={handleAvatarUpload}
										aria-label="رفع صورة شخصية جديدة"
									/>
								</motion.div>

								<h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
									{user.name}
								</h2>
								<p className="text-sm text-muted-foreground mb-6 flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50">
									<Mail className="h-4 w-4 text-primary" />
									{user.email}
								</p>

								<div className="w-full space-y-3 text-sm">
									{user.grade && (
										<div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-blue-50 to-blue-100/50 border border-blue-200/50 shadow-sm">
											<span className="text-muted-foreground flex items-center gap-2 font-medium">
												<School className="h-4 w-4 text-blue-600" />
												الصف:
											</span>
											<span className="font-semibold text-blue-700">{user.grade}</span>
										</div>
									)}
									{user.school && (
										<div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-purple-50 to-purple-100/50 border border-purple-200/50 shadow-sm">
											<span className="text-muted-foreground flex items-center gap-2 font-medium">
												<School className="h-4 w-4 text-purple-600" />
												المدرسة:
											</span>
											<span className="font-semibold text-purple-700">{user.school}</span>
										</div>
									)}
									<div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-green-50 to-green-100/50 border border-green-200/50 shadow-sm">
										<span className="text-muted-foreground flex items-center gap-2 font-medium">
											<Calendar className="h-4 w-4 text-green-600" />
											انضم في:
										</span>
										<span className="font-semibold text-green-700">
											{new Date(user.createdAt).toLocaleDateString("ar-EG")}
										</span>
									</div>
								</div>

								<Button
									className="mt-6 w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300"
									onClick={() => setIsEditing(!isEditing)}
									variant={isEditing ? "outline" : "default"}
								>
									{isEditing ? (
										<>
											<X className="ml-2 h-4 w-4" />
											إلغاء التعديل
										</>
									) : (
										<>
											<Edit className="ml-2 h-4 w-4" />
											تعديل الملف الشخصي
										</>
									)}
								</Button>
							</div>
						</CardContent>
					</Card>

					{/* Stats Card - Enhanced */}
					{stats && (
						<Card className="shadow-xl border-2 border-primary/10 overflow-hidden">
							<div className="h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
							<CardHeader className="bg-gradient-to-br from-primary/5 to-primary/10">
								<CardTitle className="flex items-center gap-2 text-primary">
									<TrendingUp className="h-5 w-5" />
									إحصائيات النشاط
								</CardTitle>
							</CardHeader>
							<CardContent className="pt-6">
								<div className="grid grid-cols-2 gap-4">
									<motion.div 
										className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 p-5 rounded-xl text-center border-2 border-blue-200 dark:border-blue-800 shadow-md hover:shadow-lg transition-all duration-300"
										whileHover={{ scale: 1.05, y: -2 }}
									>
										<div className="text-3xl font-bold text-blue-700 dark:text-blue-300 mb-1">
											{stats.completedTasks}
										</div>
										<div className="text-xs font-semibold text-blue-600 dark:text-blue-400">مهام مكتملة</div>
									</motion.div>
									<motion.div 
										className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 p-5 rounded-xl text-center border-2 border-green-200 dark:border-green-800 shadow-md hover:shadow-lg transition-all duration-300"
										whileHover={{ scale: 1.05, y: -2 }}
									>
										<div className="text-3xl font-bold text-green-700 dark:text-green-300 mb-1">
											{Math.floor(stats.totalStudyTime / 60)}س
										</div>
										<div className="text-xs font-semibold text-green-600 dark:text-green-400">وقت الدراسة</div>
									</motion.div>
									<motion.div 
										className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 p-5 rounded-xl text-center border-2 border-purple-200 dark:border-purple-800 shadow-md hover:shadow-lg transition-all duration-300"
										whileHover={{ scale: 1.05, y: -2 }}
									>
										<div className="text-3xl font-bold text-purple-700 dark:text-purple-300 mb-1">
											{stats.coursesEnrolled}
										</div>
										<div className="text-xs font-semibold text-purple-600 dark:text-purple-400">دورات مسجلة</div>
									</motion.div>
									<motion.div 
										className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 p-5 rounded-xl text-center border-2 border-orange-200 dark:border-orange-800 shadow-md hover:shadow-lg transition-all duration-300"
										whileHover={{ scale: 1.05, y: -2 }}
									>
										<div className="text-3xl font-bold text-orange-700 dark:text-orange-300 mb-1">
											{stats.examsTaken}
										</div>
										<div className="text-xs font-semibold text-orange-600 dark:text-orange-400">امتحانات</div>
									</motion.div>
								</div>
								{stats.studyStreak && (
									<motion.div 
										className="mt-6 p-4 rounded-xl bg-gradient-to-r from-yellow-50 via-orange-50 to-amber-50 dark:from-yellow-950 dark:to-orange-950 border-2 border-yellow-300 dark:border-yellow-800 shadow-md"
										initial={{ opacity: 0, scale: 0.9 }}
										animate={{ opacity: 1, scale: 1 }}
										transition={{ delay: 0.2 }}
									>
										<div className="flex items-center justify-center gap-3">
											<Sparkles className="h-6 w-6 text-yellow-600 dark:text-yellow-400 animate-pulse" />
											<span className="text-base font-bold text-yellow-700 dark:text-yellow-400">
												{stats.studyStreak} يوم متتالي 🔥
											</span>
										</div>
									</motion.div>
								)}
							</CardContent>
						</Card>
					)}
				</div>

				{/* Profile Content */}
				<div className="lg:col-span-2">
					<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
					<TabsList className="grid w-full grid-cols-5 mb-6">
						<TabsTrigger value="overview">نظرة عامة</TabsTrigger>
						<TabsTrigger value="stats">الإحصائيات</TabsTrigger>
						<TabsTrigger value="achievements">الإنجازات</TabsTrigger>
						<TabsTrigger value="activity">النشاط</TabsTrigger>
						<TabsTrigger value="security">الأمان</TabsTrigger>
					</TabsList>

						<TabsContent value="overview" className="space-y-6">
							{isEditing ? (
								<Card>
									<CardHeader>
										<CardTitle>تعديل المعلومات الشخصية</CardTitle>
										<CardDescription>قم بتحديث معلوماتك الشخصية أدناه</CardDescription>
									</CardHeader>
									<CardContent>
										<form onSubmit={handleEditSubmit} className="space-y-4">
											<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
												<div className="space-y-2">
													<Label htmlFor="name">الاسم</Label>
													<Input
														id="name"
														name="name"
														value={editForm.name}
														onChange={handleInputChange}
														required
													/>
												</div>
												<div className="space-y-2">
													<Label htmlFor="email">البريد الإلكتروني</Label>
													<Input
														id="email"
														name="email"
														type="email"
														value={editForm.email}
														onChange={handleInputChange}
														required
													/>
												</div>
												<div className="space-y-2">
													<Label htmlFor="grade">الصف الدراسي</Label>
													<Input
														id="grade"
														name="grade"
														value={editForm.grade}
														onChange={handleInputChange}
													/>
												</div>
												<div className="space-y-2">
													<Label htmlFor="school">المدرسة</Label>
													<Input
														id="school"
														name="school"
														value={editForm.school}
														onChange={handleInputChange}
													/>
												</div>
											</div>
											<div className="space-y-2">
												<Label htmlFor="bio">نبذة شخصية</Label>
												<Textarea
													id="bio"
													name="bio"
													rows={4}
													value={editForm.bio}
													onChange={handleInputChange}
													placeholder="اكتب نبذة شخصية عنك..."
												/>
											</div>
											<div className="flex justify-end gap-3 pt-4">
												<Button
													type="button"
													variant="outline"
													onClick={() => setIsEditing(false)}
													disabled={isSaving}
												>
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
							) : (
								<>
									{/* Bio Section */}
									<Card>
										<CardHeader>
											<CardTitle className="flex items-center gap-2">
												<User className="h-5 w-5" />
												نبذة شخصية
											</CardTitle>
										</CardHeader>
										<CardContent>
											{user.bio ? (
												<p className="text-muted-foreground leading-relaxed">{user.bio}</p>
											) : (
												<div className="text-center py-8 text-muted-foreground">
													<User className="h-12 w-12 mx-auto mb-2 opacity-50" />
													<p>لا توجد نبذة شخصية مضافة</p>
													<Button
														variant="outline"
														size="sm"
														className="mt-4"
														onClick={() => setIsEditing(true)}
													>
														<Edit className="ml-2 h-4 w-4" />
														أضف نبذة شخصية
													</Button>
												</div>
											)}
										</CardContent>
									</Card>

									{/* Quick Stats */}
									{stats && (
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<Card>
												<CardContent className="pt-6">
													<div className="flex items-center justify-between">
														<div>
															<p className="text-sm text-muted-foreground">وقت الدراسة الإجمالي</p>
															<p className="text-2xl font-bold mt-1">
																{Math.floor(stats.totalStudyTime / 60)} ساعة
															</p>
														</div>
														<Clock className="h-8 w-8 text-blue-500" />
													</div>
												</CardContent>
											</Card>
											<Card>
												<CardContent className="pt-6">
													<div className="flex items-center justify-between">
														<div>
															<p className="text-sm text-muted-foreground">المهام المكتملة</p>
															<p className="text-2xl font-bold mt-1">{stats.completedTasks}</p>
														</div>
														<CheckCircle2 className="h-8 w-8 text-green-500" />
													</div>
												</CardContent>
											</Card>
										</div>
									)}
								</>
							)}
						</TabsContent>

						<TabsContent value="stats" className="space-y-6">
							{stats ? (
								<>
									<Card>
										<CardHeader>
											<CardTitle className="flex items-center gap-2">
												<BarChart3 className="h-5 w-5" />
												إحصائيات مفصلة
											</CardTitle>
										</CardHeader>
										<CardContent>
											<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
												<div className="space-y-2">
													<div className="flex items-center gap-2 text-sm text-muted-foreground">
														<CheckCircle2 className="h-4 w-4" />
														مهام مكتملة
													</div>
													<p className="text-2xl font-bold">{stats.completedTasks}</p>
												</div>
												<div className="space-y-2">
													<div className="flex items-center gap-2 text-sm text-muted-foreground">
														<Clock className="h-4 w-4" />
														وقت الدراسة
													</div>
													<p className="text-2xl font-bold">{Math.floor(stats.totalStudyTime / 60)} س</p>
												</div>
												<div className="space-y-2">
													<div className="flex items-center gap-2 text-sm text-muted-foreground">
														<BookOpen className="h-4 w-4" />
														دورات مسجلة
													</div>
													<p className="text-2xl font-bold">{stats.coursesEnrolled}</p>
												</div>
												<div className="space-y-2">
													<div className="flex items-center gap-2 text-sm text-muted-foreground">
														<FileText className="h-4 w-4" />
														امتحانات
													</div>
													<p className="text-2xl font-bold">{stats.examsTaken}</p>
												</div>
											</div>
											<Separator className="my-6" />
											<div className="grid grid-cols-2 gap-4">
												<div className="space-y-2">
													<div className="flex items-center gap-2 text-sm text-muted-foreground">
														<MessageSquare className="h-4 w-4" />
														مشاركات في المنتدى
													</div>
													<p className="text-2xl font-bold">{stats.forumPosts}</p>
												</div>
												<div className="space-y-2">
													<div className="flex items-center gap-2 text-sm text-muted-foreground">
														<FileText className="h-4 w-4" />
														مقالات في المدونة
													</div>
													<p className="text-2xl font-bold">{stats.blogPosts}</p>
												</div>
											</div>
										</CardContent>
									</Card>
								</>
							) : (
								<Card>
									<CardContent className="pt-6 text-center py-12">
										<Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
										<p className="text-muted-foreground">لا توجد إحصائيات متاحة</p>
									</CardContent>
								</Card>
							)}
						</TabsContent>

						<TabsContent value="achievements" className="space-y-6">
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Award className="h-5 w-5" />
										الإنجازات
									</CardTitle>
									<CardDescription>الإنجازات التي حصلت عليها</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="text-center py-12 text-muted-foreground">
										<Award className="h-16 w-16 mx-auto mb-4 opacity-30" />
										<p>لا توجد إنجازات متاحة حالياً</p>
										<Button variant="outline" className="mt-4" asChild>
											<Link href="/achievements">عرض جميع الإنجازات</Link>
										</Button>
									</div>
								</CardContent>
							</Card>
						</TabsContent>

						<TabsContent value="activity" className="space-y-6">
							<Card>
								<CardHeader>
									<div className="flex justify-between items-center">
										<div>
											<CardTitle className="flex items-center gap-2">
												<Activity className="h-5 w-5" />
												النشاط الأخير
											</CardTitle>
											<CardDescription>آخر الأنشطة التي قمت بها في المنصة</CardDescription>
										</div>
										<Button variant="outline" size="sm" asChild>
											<Link href="/activity">عرض الكل</Link>
										</Button>
									</div>
								</CardHeader>
								<CardContent>
									<div className="text-center py-12 text-muted-foreground">
										<Activity className="h-16 w-16 mx-auto mb-4 opacity-30" />
										<p>لا يوجد نشاط مؤخراً</p>
										<Button variant="outline" className="mt-4" asChild>
											<Link href="/">ابدأ التعلم الآن</Link>
										</Button>
									</div>
								</CardContent>
							</Card>
						</TabsContent>

						<TabsContent value="security" className="space-y-6">
							<SecurityTab userId={userId} />
						</TabsContent>
					</Tabs>
				</div>
			</div>
					</div>
				</div>
			)}
		</AuthGuard>
	);
}
