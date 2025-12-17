"use client";

import { memo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, X } from "lucide-react";
import type { EditForm } from "./types";

interface AccountInformationTabProps {
	editForm: EditForm;
	onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
	onSubmit: (e: React.FormEvent) => void;
	onCancel: () => void;
	isSaving: boolean;
}

const MAX_BIO_LENGTH = 500;
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 255;
const MAX_GRADE_LENGTH = 50;
const MAX_SCHOOL_LENGTH = 200;

function AccountInformationTab({
	editForm,
	onInputChange,
	onSubmit,
	onCancel,
	isSaving,
}: AccountInformationTabProps) {
	const handleSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();
			onSubmit(e);
		},
		[onSubmit]
	);

	const bioLength = editForm.bio?.length || 0;
	const isBioValid = bioLength <= MAX_BIO_LENGTH;

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>تعديل المعلومات الشخصية</CardTitle>
					<CardDescription>قم بتحديث معلوماتك الشخصية أدناه</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4" noValidate>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="account-name">الاسم</Label>
								<Input
									id="account-name"
									name="name"
									value={editForm.name}
									onChange={onInputChange}
									required
									maxLength={MAX_NAME_LENGTH}
									aria-required="true"
									aria-label="الاسم الكامل"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="account-email">البريد الإلكتروني</Label>
								<Input
									id="account-email"
									name="email"
									type="email"
									value={editForm.email}
									onChange={onInputChange}
									required
									maxLength={MAX_EMAIL_LENGTH}
									aria-required="true"
									aria-label="البريد الإلكتروني"
									autoComplete="email"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="account-grade">الصف الدراسي</Label>
								<Input
									id="account-grade"
									name="grade"
									value={editForm.grade}
									onChange={onInputChange}
									maxLength={MAX_GRADE_LENGTH}
									aria-label="الصف الدراسي"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="account-school">المدرسة</Label>
								<Input
									id="account-school"
									name="school"
									value={editForm.school}
									onChange={onInputChange}
									maxLength={MAX_SCHOOL_LENGTH}
									aria-label="المدرسة"
								/>
							</div>
						</div>
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label htmlFor="account-bio">نبذة شخصية</Label>
								<span
									className={`text-xs ${
										isBioValid ? "text-muted-foreground" : "text-destructive"
									}`}
									aria-live="polite"
								>
									{bioLength}/{MAX_BIO_LENGTH}
								</span>
							</div>
							<Textarea
								id="account-bio"
								name="bio"
								rows={4}
								value={editForm.bio}
								onChange={onInputChange}
								placeholder="اكتب نبذة شخصية عنك..."
								maxLength={MAX_BIO_LENGTH}
								aria-label="نبذة شخصية"
								aria-invalid={!isBioValid}
								className={!isBioValid ? "border-destructive focus-visible:ring-destructive" : ""}
							/>
							{!isBioValid && (
								<p className="text-sm text-destructive" role="alert">
									تم تجاوز الحد الأقصى لعدد الأحرف
								</p>
							)}
						</div>
						<div className="flex justify-end gap-3 pt-4">
							<Button
								type="button"
								variant="outline"
								onClick={onCancel}
								disabled={isSaving}
								aria-label="إلغاء التعديل"
							>
								<X className="ml-2 h-4 w-4" aria-hidden="true" />
								إلغاء
							</Button>
							<Button type="submit" disabled={isSaving || !isBioValid} aria-label="حفظ التغييرات">
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
										حفظ التغييرات
									</>
								)}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}

export default memo(AccountInformationTab);

