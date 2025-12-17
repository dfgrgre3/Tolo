"use client";

import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Mail, Calendar, School, Clock, CheckCircle2, Link2, Camera } from "lucide-react";
import type { AccountUser } from "./types";

interface AccountSidebarProps {
	user: AccountUser;
	onAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const PROVIDER_NAMES: Record<string, string> = {
	google: "جوجل",
	facebook: "فيسبوك",
};

function AccountSidebar({ user, onAvatarUpload }: AccountSidebarProps) {
	const formattedJoinDate = useMemo(
		() => new Date(user.createdAt).toLocaleDateString("ar-EG"),
		[user.createdAt]
	);

	const userInitial = useMemo(() => user.name.charAt(0).toUpperCase(), [user.name]);

	const providerName = useMemo(
		() => (user.provider ? PROVIDER_NAMES[user.provider] || user.provider : null),
		[user.provider]
	);

	return (
		<div className="lg:col-span-1 space-y-6">
			<Card className="overflow-hidden shadow-xl border-2 border-primary/10">
				<div className="h-24 bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 relative overflow-hidden">
					<div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />
				</div>
				<CardContent className="p-6 pt-0">
					<div className="flex flex-col items-center -mt-12">
						<motion.div
							className="relative mb-4"
							whileHover={{ scale: 1.05 }}
							transition={{ type: "spring", stiffness: 300 }}
						>
							<Avatar className="w-24 h-24 border-4 border-background shadow-2xl ring-4 ring-primary/20">
								<AvatarImage src={user.avatar} alt={`صورة ${user.name}`} />
								<AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
									{userInitial}
								</AvatarFallback>
							</Avatar>
							<label
								htmlFor="avatar-upload-account"
								className="absolute bottom-0 right-0 bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-full p-2.5 cursor-pointer shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 ring-2 ring-background"
								title="رفع صورة شخصية جديدة"
								aria-label="رفع صورة شخصية جديدة"
							>
								<Camera className="h-4 w-4" aria-hidden="true" />
								<span className="sr-only">رفع صورة شخصية جديدة</span>
							</label>
							<input
								id="avatar-upload-account"
								type="file"
								className="hidden"
								accept="image/*"
								onChange={onAvatarUpload}
								aria-label="رفع صورة شخصية جديدة"
							/>
						</motion.div>

						<h2 className="text-xl font-bold mb-1 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
							{user.name}
						</h2>
						<p className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
							<Mail className="h-3 w-3 text-primary" aria-hidden="true" />
							{user.email}
						</p>

						<div className="w-full space-y-2 text-sm">
							{user.emailVerified && (
								<Badge
									className="w-full justify-center bg-green-100 text-green-700 border-green-300"
									aria-label="البريد الإلكتروني مؤكد"
								>
									<CheckCircle2 className="h-3 w-3 ml-1" aria-hidden="true" />
									البريد الإلكتروني مؤكد
								</Badge>
							)}
							{user.phoneVerified && (
								<Badge
									className="w-full justify-center bg-blue-100 text-blue-700 border-blue-300"
									aria-label="الهاتف مؤكد"
								>
									<CheckCircle2 className="h-3 w-3 ml-1" aria-hidden="true" />
									الهاتف مؤكد
								</Badge>
							)}
							{user.provider && providerName && (
								<Badge
									className="w-full justify-center bg-purple-100 text-purple-700 border-purple-300"
									aria-label={`متصل بـ ${providerName}`}
								>
									<Link2 className="h-3 w-3 ml-1" aria-hidden="true" />
									متصل بـ {providerName}
								</Badge>
							)}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Quick Stats */}
			<Card className="shadow-lg border-2 border-primary/10">
				<CardHeader className="pb-3">
					<CardTitle className="text-sm font-semibold flex items-center gap-2">
						<Clock className="h-4 w-4" aria-hidden="true" />
						معلومات الحساب
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3 text-sm">
					<div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
						<span className="text-muted-foreground flex items-center gap-2">
							<Calendar className="h-4 w-4" aria-hidden="true" />
							انضم في:
						</span>
						<span className="font-semibold" aria-label={`تاريخ الانضمام: ${formattedJoinDate}`}>
							{formattedJoinDate}
						</span>
					</div>
					{user.grade && (
						<div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
							<span className="text-muted-foreground flex items-center gap-2">
								<School className="h-4 w-4" aria-hidden="true" />
								الصف:
							</span>
							<span className="font-semibold" aria-label={`الصف: ${user.grade}`}>
								{user.grade}
							</span>
						</div>
					)}
					{user.school && (
						<div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
							<span className="text-muted-foreground flex items-center gap-2">
								<School className="h-4 w-4" aria-hidden="true" />
								المدرسة:
							</span>
							<span className="font-semibold text-xs" aria-label={`المدرسة: ${user.school}`}>
								{user.school}
							</span>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

export default memo(AccountSidebar);

