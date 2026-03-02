"use client";

import { memo, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { User, CheckCircle2, Edit } from "lucide-react";

import type { AccountUser } from "./types";

interface AccountOverviewTabProps {
	user: AccountUser;
	onEditClick: () => void;
}

function AccountOverviewTab({ user, onEditClick }: AccountOverviewTabProps) {

	const formattedJoinDate = useMemo(
		() =>
			new Date(user.createdAt).toLocaleDateString("ar-EG", {
				year: "numeric",
				month: "long",
				day: "numeric",
			}),
		[user.createdAt]
	);

	const handleEditClick = useCallback(() => {
		onEditClick();
	}, [onEditClick]);



	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<User className="h-5 w-5" aria-hidden="true" />
						معلومات الحساب الأساسية
					</CardTitle>
					<CardDescription>عرض وتعديل معلوماتك الشخصية</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<Label className="text-muted-foreground">الاسم الكامل</Label>
							<p className="font-semibold mt-1" aria-label={`الاسم: ${user.name}`}>
								{user.name}
							</p>
						</div>
						<div>
							<Label className="text-muted-foreground">البريد الإلكتروني</Label>
							<p className="font-semibold mt-1 flex items-center gap-2">
								<span aria-label={`البريد الإلكتروني: ${user.email}`}>{user.email}</span>
								{user.emailVerified && (
									<Badge
										variant="outline"
										className="bg-green-50 text-green-700 border-green-300"
										aria-label="البريد الإلكتروني مؤكد"
									>
										<CheckCircle2 className="h-3 w-3 ml-1" aria-hidden="true" />
										مؤكد
									</Badge>
								)}
							</p>
						</div>
						{user.phone && (
							<div>
								<Label className="text-muted-foreground">رقم الهاتف</Label>
								<p className="font-semibold mt-1 flex items-center gap-2">
									<span aria-label={`رقم الهاتف: ${user.phone}`}>{user.phone}</span>
									{user.phoneVerified && (
										<Badge
											variant="outline"
											className="bg-blue-50 text-blue-700 border-blue-300"
											aria-label="الهاتف مؤكد"
										>
											<CheckCircle2 className="h-3 w-3 ml-1" aria-hidden="true" />
											مؤكد
										</Badge>
									)}
								</p>
							</div>
						)}
						<div>
							<Label className="text-muted-foreground">تاريخ الانضمام</Label>
							<p className="font-semibold mt-1" aria-label={`تاريخ الانضمام: ${formattedJoinDate}`}>
								{formattedJoinDate}
							</p>
						</div>
					</div>
					{user.bio && (
						<div>
							<Label className="text-muted-foreground">نبذة شخصية</Label>
							<p className="mt-1 text-muted-foreground">{user.bio}</p>
						</div>
					)}
					<Button onClick={handleEditClick} className="w-full md:w-auto" aria-label="تعديل المعلومات">
						<Edit className="ml-2 h-4 w-4" aria-hidden="true" />
						تعديل المعلومات
					</Button>
				</CardContent>
			</Card>

      {/* Security status card removed */}

		</div>
	);
}

export default memo(AccountOverviewTab);

