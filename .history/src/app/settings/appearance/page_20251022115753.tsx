"use client";

import { useState } from "react";
import { Button } from "@/shared/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Palette, Moon, Sun } from "@/components/ui/icons";
import { toast } from "sonner";

export default function AppearanceSettings() {
	const [theme, setTheme] = useState("light");
	const [fontSize, setFontSize] = useState("medium");
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	const [primaryColor, setPrimaryColor] = useState("blue");
	const [backgroundStyle, setBackgroundStyle] = useState("default");

	async function saveSettings() {
		// حفظ إعدادات المظهر
		toast.success("تم حفظ إعدادات المظهر بنجاح");
	}

	return (
		<div className="px-4">
			<section className="mx-auto max-w-7xl py-8 space-y-6">
				<h1 className="text-2xl md:text-3xl font-bold">إعدادات المظهر</h1>

				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" />السمة العامة</CardTitle>
							<CardDescription>تخصيص مظهر التطبيق</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							<div className="space-y-4">
								<h3 className="text-lg font-medium">النمط</h3>
								<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
									<div 
										className={`border rounded-lg p-4 cursor-pointer transition-all ${theme === "light" ? "ring-2 ring-primary" : ""}`}
										onClick={() => setTheme("light")}
									>
										<div className="flex items-center gap-2 mb-2">
											<Sun className="h-5 w-5" />
											<span>فاتح</span>
										</div>
										<div className="bg-white border rounded h-24 flex items-center justify-center">
											<div className="bg-gray-100 rounded w-16 h-16"></div>
										</div>
									</div>

									<div 
										className={`border rounded-lg p-4 cursor-pointer transition-all ${theme === "dark" ? "ring-2 ring-primary" : ""}`}
										onClick={() => setTheme("dark")}
									>
										<div className="flex items-center gap-2 mb-2">
											<Moon className="h-5 w-5" />
											<span>داكن</span>
										</div>
										<div className="bg-gray-900 border rounded h-24 flex items-center justify-center">
											<div className="bg-gray-700 rounded w-16 h-16"></div>
										</div>
									</div>

									<div 
										className={`border rounded-lg p-4 cursor-pointer transition-all ${theme === "system" ? "ring-2 ring-primary" : ""}`}
										onClick={() => setTheme("system")}
									>
										<div className="flex items-center gap-2 mb-2">
											<div className="h-5 w-5 flex items-center justify-center">
												<Sun className="h-3 w-3" />
												<Moon className="h-3 w-3" />
											</div>
											<span>النظام</span>
										</div>
										<div className="bg-gradient-to-r from-white to-gray-900 border rounded h-24 flex items-center justify-center">
											<div className="bg-gradient-to-r from-gray-100 to-gray-700 rounded w-16 h-16"></div>
										</div>
									</div>
								</div>
							</div>

							<Separator />

							<div className="space-y-4">
								<h3 className="text-lg font-medium">حجم الخط</h3>
								<Select value={fontSize} onValueChange={setFontSize}>
									<SelectTrigger className="w-full md:w-64">
										<SelectValue placeholder="اختر حجم الخط" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="small">صغير</SelectItem>
										<SelectItem value="medium">متوسط</SelectItem>
										<SelectItem value="large">كبير</SelectItem>
										<SelectItem value="extra-large">كبير جداً</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<Separator />

							<div className="space-y-4">
								<h3 className="text-lg font-medium">اللون الأساسي</h3>
								<div className="grid grid-cols-2 md:grid-cols-5 gap-3">
									{["blue", "green", "purple", "red", "orange"].map((color) => (
										<div 
											key={color}
											className={`h-12 rounded-md cursor-pointer border-2 ${primaryColor === color ? "ring-2 ring-offset-2" : ""}`}
											style={{ backgroundColor: `var(--${color}-500)` }}
											onClick={() => setPrimaryColor(color)}
										></div>
									))}
								</div>
							</div>

							<Separator />

							<div className="space-y-4">
								<h3 className="text-lg font-medium">خيارات الشريط الجانبي</h3>
								<div className="flex items-center justify-between">
									<div>
										<Label>طي الشريط الجانبي تلقائياً</Label>
										<p className="text-sm text-muted-foreground">
											سيتم طي الشريط الجانبي عند عدم استخدامه
										</p>
									</div>
									<Switch
										checked={sidebarCollapsed}
										onCheckedChange={setSidebarCollapsed}
									/>
								</div>
							</div>

							<Separator />

							<div className="space-y-4">
								<h3 className="text-lg font-medium">نمط الخلفية</h3>
								<Select value={backgroundStyle} onValueChange={setBackgroundStyle}>
									<SelectTrigger className="w-full md:w-64">
										<SelectValue placeholder="اختر نمط الخلفية" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="default">افتراضي</SelectItem>
										<SelectItem value="gradient">تدرج لوني</SelectItem>
										<SelectItem value="pattern">نمط</SelectItem>
										<SelectItem value="custom">مخصص</SelectItem>
									</SelectContent>
								</Select>
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
