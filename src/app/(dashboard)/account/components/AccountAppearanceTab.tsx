"use client";

import { memo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Palette, Save, Sun, Moon } from "lucide-react";
import type { AppearanceSettings } from "./types";
import {
	THEME_OPTIONS,
	FONT_SIZE_OPTIONS,
	PRIMARY_COLOR_OPTIONS,
} from "./constants";

interface AccountAppearanceTabProps {
	appearanceSettings: AppearanceSettings;
	onSettingsChange: (settings: AppearanceSettings) => void;
	onSave: () => void;
}

function AccountAppearanceTab({
	appearanceSettings,
	onSettingsChange,
	onSave,
}: AccountAppearanceTabProps) {
	const handleThemeChange = useCallback(
		(value: AppearanceSettings["theme"]) => {
			onSettingsChange({ ...appearanceSettings, theme: value });
		},
		[appearanceSettings, onSettingsChange]
	);

	const handleFontSizeChange = useCallback(
		(value: AppearanceSettings["fontSize"]) => {
			onSettingsChange({ ...appearanceSettings, fontSize: value });
		},
		[appearanceSettings, onSettingsChange]
	);

	const handlePrimaryColorChange = useCallback(
		(value: AppearanceSettings["primaryColor"]) => {
			onSettingsChange({ ...appearanceSettings, primaryColor: value });
		},
		[appearanceSettings, onSettingsChange]
	);

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Palette className="h-5 w-5" aria-hidden="true" />
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
							<Select value={appearanceSettings.theme} onValueChange={handleThemeChange}>
								<SelectTrigger id="theme" aria-label="اختر الوضع">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{THEME_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.icon ? (
												<div className="flex items-center gap-2">
													{option.icon === "Sun" && <Sun className="h-4 w-4" aria-hidden="true" />}
													{option.icon === "Moon" && <Moon className="h-4 w-4" aria-hidden="true" />}
													{option.label}
												</div>
											) : (
												option.label
											)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="font-size" className="text-base font-semibold">
								حجم الخط
							</Label>
							<Select value={appearanceSettings.fontSize} onValueChange={handleFontSizeChange}>
								<SelectTrigger id="font-size" aria-label="اختر حجم الخط">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{FONT_SIZE_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="primary-color" className="text-base font-semibold">
								اللون الأساسي
							</Label>
							<Select value={appearanceSettings.primaryColor} onValueChange={handlePrimaryColorChange}>
								<SelectTrigger id="primary-color" aria-label="اختر اللون الأساسي">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{PRIMARY_COLOR_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="flex justify-end pt-4">
						<Button onClick={onSave} aria-label="حفظ إعدادات المظهر">
							<Save className="ml-2 h-4 w-4" aria-hidden="true" />
							حفظ الإعدادات
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

export default memo(AccountAppearanceTab);

