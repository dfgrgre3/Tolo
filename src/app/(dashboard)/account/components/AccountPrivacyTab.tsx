"use client";

import { memo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, Save } from "lucide-react";
import type { PrivacySettings } from "./types";
import { PROFILE_VISIBILITY_OPTIONS } from "./constants";

interface AccountPrivacyTabProps {
	privacySettings: PrivacySettings;
	onSettingsChange: (settings: PrivacySettings) => void;
	onSave: () => void;
	isSaving: boolean;
}

interface PrivacySwitchOption {
	id: keyof PrivacySettings;
	label: string;
	description: string;
}

const PRIVACY_SWITCH_OPTIONS: PrivacySwitchOption[] = [
	{
		id: "showEmail",
		label: "إظهار البريد الإلكتروني",
		description: "السماح للآخرين برؤية بريدك الإلكتروني",
	},
	{
		id: "showPhone",
		label: "إظهار رقم الهاتف",
		description: "السماح للآخرين برؤية رقم هاتفك",
	},
	{
		id: "allowMessages",
		label: "السماح بالرسائل",
		description: "السماح للآخرين بإرسال رسائل خاصة لك",
	},
	{
		id: "activityStatus",
		label: "حالة النشاط",
		description: "إظهار حالة نشاطك (متصل/غير متصل)",
	},
];

function AccountPrivacyTab({
	privacySettings,
	onSettingsChange,
	onSave,
	isSaving,
}: AccountPrivacyTabProps) {
	const updateSetting = useCallback(
		<K extends keyof PrivacySettings>(key: K, value: PrivacySettings[K]) => {
			onSettingsChange({ ...privacySettings, [key]: value });
		},
		[privacySettings, onSettingsChange]
	);

	const handleProfileVisibilityChange = useCallback(
		(value: PrivacySettings["profileVisibility"]) => {
			updateSetting("profileVisibility", value);
		},
		[updateSetting]
	);

	const handleSwitchChange = useCallback(
		(key: keyof PrivacySettings) => (checked: boolean) => {
			updateSetting(key, checked);
		},
		[updateSetting]
	);

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Lock className="h-5 w-5" aria-hidden="true" />
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
								onValueChange={handleProfileVisibilityChange}
							>
								<SelectTrigger id="profile-visibility" aria-label="اختر رؤية الملف الشخصي">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{PROFILE_VISIBILITY_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<Separator />

						{PRIVACY_SWITCH_OPTIONS.map((option) => (
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
									checked={privacySettings[option.id] as boolean}
									onCheckedChange={handleSwitchChange(option.id)}
									aria-label={option.label}
								/>
							</div>
						))}
					</div>

					<div className="flex justify-end pt-4">
						<Button onClick={onSave} disabled={isSaving} aria-label="حفظ إعدادات الخصوصية">
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

export default memo(AccountPrivacyTab);

