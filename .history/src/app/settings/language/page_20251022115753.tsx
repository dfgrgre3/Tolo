"use client";

import { useState } from "react";
import { Button } from "@/shared/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Globe } from "@/components/ui/icons";
import { Badge } from "@/shared/badge";
import { toast } from "sonner";

export default function LanguageSettings() {
	const [appLanguage, setAppLanguage] = useState("ar");
	const [contentLanguage, setContentLanguage] = useState("ar");
	const [dateLocale, setDateLocale] = useState("ar-SA");
	const [rtlEnabled, setRtlEnabled] = useState(true);

	async function saveSettings() {
		// حفظ إعدادات اللغة
		toast.success("تم حفظ إعدادات اللغة بنجاح");
	}

	const languages = [
		{ code: "ar", name: "العربية", nativeName: "العربية" },
		{ code: "en", name: "English", nativeName: "English" },
		{ code: "fr", name: "French", nativeName: "Français" },
		{ code: "es", name: "Spanish", nativeName: "Español" },
		{ code: "de", name: "German", nativeName: "Deutsch" },
	];

	const dateLocales = [
		{ code: "ar-SA", name: "العربية (السعودية)" },
		{ code: "en-US", name: "English (United States)" },
		{ code: "en-GB", name: "English (United Kingdom)" },
		{ code: "fr-FR", name: "Français (France)" },
		{ code: "es-ES", name: "Español (España)" },
	];

	return (
		<div className="px-4">
			<section className="mx-auto max-w-7xl py-8 space-y-6">
				<h1 className="text-2xl md:text-3xl font-bold">إعدادات اللغة</h1>

				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" />تفضيلات اللغة</CardTitle>
							<CardDescription>تخصيص لغة التطبيق والمحتوى</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							<div className="space-y-4">
								<h3 className="text-lg font-medium">لغة واجهة التطبيق</h3>
								<Select value={appLanguage} onValueChange={setAppLanguage}>
									<SelectTrigger className="w-full md:w-80">
										<SelectValue placeholder="اختر لغة التطبيق" />
									</SelectTrigger>
									<SelectContent>
										{languages.map((lang) => (
											<SelectItem key={lang.code} value={lang.code}>
												<div className="flex items-center gap-2">
													<span>{lang.nativeName}</span>
													{lang.code !== lang.nativeName && (
														<Badge variant="outline" className="text-xs">
															{lang.name}
														</Badge>
													)}
												</div>
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<p className="text-sm text-muted-foreground">
									سيتم تغيير لغة واجهة المستخدم في جميع أنحاء التطبيق
								</p>
							</div>

							<Separator />

							<div className="space-y-4">
								<h3 className="text-lg font-medium">لغة المحتوى</h3>
								<Select value={contentLanguage} onValueChange={setContentLanguage}>
									<SelectTrigger className="w-full md:w-80">
										<SelectValue placeholder="اختر لغة المحتوى" />
									</SelectTrigger>
									<SelectContent>
										{languages.map((lang) => (
											<SelectItem key={lang.code} value={lang.code}>
												<div className="flex items-center gap-2">
													<span>{lang.nativeName}</span>
													{lang.code !== lang.nativeName && (
														<Badge variant="outline" className="text-xs">
															{lang.name}
														</Badge>
													)}
												</div>
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<p className="text-sm text-muted-foreground">
									سيتم عرض المحتوى التعليمي باللغة المختارة
								</p>
							</div>

							<Separator />

							<div className="space-y-4">
								<h3 className="text-lg font-medium">تنسيق التاريخ والوقت</h3>
								<Select value={dateLocale} onValueChange={setDateLocale}>
									<SelectTrigger className="w-full md:w-80">
										<SelectValue placeholder="اختر تنسيق التاريخ والوقت" />
									</SelectTrigger>
									<SelectContent>
										{dateLocales.map((locale) => (
											<SelectItem key={locale.code} value={locale.code}>
												{locale.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<Separator />

							<div className="space-y-4">
								<h3 className="text-lg font-medium">اتجاه النص</h3>
								<div className="flex items-center justify-between">
									<div>
										<Label>تمكين الوضع من اليمين إلى اليسار (RTL)</Label>
										<p className="text-sm text-muted-foreground">
											عرض النصوص من اليمين إلى اليسار (مناسب للغة العربية)
										</p>
									</div>
									<div className="flex items-center space-x-2">
										<span className="text-sm">LTR</span>
										<div className="relative inline-block w-10 mr-2 align-middle select-none">
											<input
												type="checkbox"
												id="rtl-toggle"
												className="sr-only"
												checked={rtlEnabled}
												onChange={(e) => setRtlEnabled(e.target.checked)}
											/>
											<div
												className={`block w-10 h-6 rounded-full transition-colors ${
													rtlEnabled ? "bg-primary" : "bg-gray-300"
												}`}
											>
												<div
													className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
														rtlEnabled ? "transform translate-x-4" : ""
													}`}
												></div>
											</div>
										</div>
										<span className="text-sm">RTL</span>
									</div>
								</div>
							</div>

							<Separator />

							<div className="space-y-4">
								<h3 className="text-lg font-medium">اللغات المفضلة</h3>
								<div className="space-y-2">
									<p className="text-sm text-muted-foreground">
										اختر اللغات التي تريد أن تظهر بها المحتوى عندما تكون متعددة اللغات
									</p>
									<div className="flex flex-wrap gap-2">
										{languages.map((lang) => (
											<Badge
												key={lang.code}
												variant="outline"
												className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
											>
												{lang.nativeName}
											</Badge>
										))}
									</div>
								</div>
							</div>
						</CardContent>
					</Card>

					<div className="flex justify-end">
						<Button onClick={saveSettings}>حفظ الإعدادات</Button>
					</div>
				</div>
			</section>
		</div>
	);
}
