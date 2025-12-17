"use client";

import { memo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Bell, Save } from "lucide-react";
import type { NotificationSettings } from "./types";

interface AccountNotificationsTabProps {
	notificationSettings: NotificationSettings;
	onSettingsChange: (settings: NotificationSettings) => void;
	onSave: () => void;
	isSaving: boolean;
}

interface NotificationOption {
	id: keyof NotificationSettings;
	label: string;
	description: string;
	section?: "general" | "specific";
}

const NOTIFICATION_OPTIONS: NotificationOption[] = [
	{
		id: "emailNotifications",
		label: "الإشعارات عبر البريد الإلكتروني",
		description: "تلقي الإشعارات المهمة عبر البريد الإلكتروني",
		section: "general",
	},
	{
		id: "smsNotifications",
		label: "الإشعارات عبر الرسائل النصية",
		description: "تلقي الإشعارات المهمة عبر الرسائل النصية",
		section: "general",
	},
	{
		id: "taskReminders",
		label: "تذكيرات المهام",
		description: "تلقي تذكيرات عند اقتراب موعد المهام",
		section: "specific",
	},
	{
		id: "examReminders",
		label: "تذكيرات الامتحانات",
		description: "تلقي تذكيرات قبل موعد الامتحانات",
		section: "specific",
	},
	{
		id: "progressReports",
		label: "تقارير التقدم",
		description: "تلقي تقارير أسبوعية عن تقدمك الدراسي",
		section: "specific",
	},
	{
		id: "marketingEmails",
		label: "رسائل تسويقية",
		description: "تلقي عروض ورسائل ترويجية من المنصة",
		section: "specific",
	},
];

function AccountNotificationsTab({
	notificationSettings,
	onSettingsChange,
	onSave,
	isSaving,
}: AccountNotificationsTabProps) {
	const updateSetting = useCallback(
		(key: keyof NotificationSettings, value: boolean) => {
			onSettingsChange({ ...notificationSettings, [key]: value });
		},
		[notificationSettings, onSettingsChange]
	);

	const handleSwitchChange = useCallback(
		(key: keyof NotificationSettings) => (checked: boolean) => {
			updateSetting(key, checked);
		},
		[updateSetting]
	);

	const generalOptions = NOTIFICATION_OPTIONS.filter((opt) => opt.section === "general");
	const specificOptions = NOTIFICATION_OPTIONS.filter((opt) => opt.section === "specific");

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Bell className="h-5 w-5" aria-hidden="true" />
						إعدادات الإشعارات
					</CardTitle>
					<CardDescription>اختر كيف ومتى تريد تلقي الإشعارات</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="space-y-4">
						{generalOptions.map((option) => (
							<div
								key={option.id}
								className="flex items-center justify-between p-4 rounded-lg border bg-muted/30"
							>
								<div className="space-y-0.5">
									<Label htmlFor={option.id} className="text-base font-semibold">
										{option.label}
									</Label>
									<p className="text-sm text-muted-foreground">{option.description}</p>
								</div>
								<Switch
									id={option.id}
									checked={notificationSettings[option.id] as boolean}
									onCheckedChange={handleSwitchChange(option.id)}
									aria-label={option.label}
								/>
							</div>
						))}

						<Separator />

						{specificOptions.map((option) => (
							<div
								key={option.id}
								className="flex items-center justify-between p-4 rounded-lg border bg-muted/30"
							>
								<div className="space-y-0.5">
									<Label htmlFor={option.id} className="text-base font-semibold">
										{option.label}
									</Label>
									<p className="text-sm text-muted-foreground">{option.description}</p>
								</div>
								<Switch
									id={option.id}
									checked={notificationSettings[option.id] as boolean}
									onCheckedChange={handleSwitchChange(option.id)}
									aria-label={option.label}
								/>
							</div>
						))}
					</div>

					<div className="flex justify-end pt-4">
						<Button onClick={onSave} disabled={isSaving} aria-label="حفظ إعدادات الإشعارات">
							{isSaving ? (
								<>
									<div
										className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"
										aria-hidden="true"
									></div>
									جاري الحفظ...
								</>
							) : (
								<>
									<Save className="ml-2 h-4 w-4" aria-hidden="true" />
									حفظ الإعدادات
								</>
							)}
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

export default memo(AccountNotificationsTab);

