"use client";

import { memo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Languages, Save } from "lucide-react";
import type { LanguageSettings } from "./types";
import { LANGUAGE_OPTIONS, DATE_FORMAT_OPTIONS, TIMEZONE_OPTIONS } from "./constants";

interface AccountLanguageTabProps {
	languageSettings: LanguageSettings;
	onSettingsChange: (settings: LanguageSettings) => void;
	onSave: () => void;
}

function AccountLanguageTab({
	languageSettings,
	onSettingsChange,
	onSave,
}: AccountLanguageTabProps) {
	const handleLanguageChange = useCallback(
		(value: LanguageSettings["language"]) => {
			onSettingsChange({ ...languageSettings, language: value });
		},
		[languageSettings, onSettingsChange]
	);

	const handleDateFormatChange = useCallback(
		(value: LanguageSettings["dateFormat"]) => {
			onSettingsChange({ ...languageSettings, dateFormat: value });
		},
		[languageSettings, onSettingsChange]
	);

	const handleTimezoneChange = useCallback(
		(value: LanguageSettings["timezone"]) => {
			onSettingsChange({ ...languageSettings, timezone: value });
		},
		[languageSettings, onSettingsChange]
	);

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Languages className="h-5 w-5" aria-hidden="true" />
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
							<Select value={languageSettings.language} onValueChange={handleLanguageChange}>
								<SelectTrigger id="language" aria-label="اختر لغة الواجهة">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{LANGUAGE_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="date-format" className="text-base font-semibold">
								تنسيق التاريخ
							</Label>
							<Select value={languageSettings.dateFormat} onValueChange={handleDateFormatChange}>
								<SelectTrigger id="date-format" aria-label="اختر تنسيق التاريخ">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{DATE_FORMAT_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="timezone" className="text-base font-semibold">
								المنطقة الزمنية
							</Label>
							<Select value={languageSettings.timezone} onValueChange={handleTimezoneChange}>
								<SelectTrigger id="timezone" aria-label="اختر المنطقة الزمنية">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{TIMEZONE_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="flex justify-end pt-4">
						<Button onClick={onSave} aria-label="حفظ إعدادات اللغة">
							<Save className="ml-2 h-4 w-4" aria-hidden="true" />
							حفظ الإعدادات
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

export default memo(AccountLanguageTab);

