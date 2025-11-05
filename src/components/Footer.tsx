"use client";

import { useAuth } from "@/components/auth/UserProvider";
import { CheckCircle2, User } from "lucide-react";
import { Badge } from "@/shared/badge";
import { motion } from "framer-motion";

export default function Footer() {
	const { user } = useAuth();
	
	return (
		<footer className={`border-t bg-background transition-all duration-300 ${user ? 'bg-gradient-to-br from-primary/5 via-background to-primary/5' : ''}`}>
			<div className="mx-auto max-w-7xl px-4 py-6 text-sm text-muted-foreground flex flex-col md:flex-row gap-2 items-center justify-between">
				<div className="flex flex-col md:flex-row gap-2 items-center">
					<p>© {new Date().getFullYear()} ثانوية بذكاء</p>
					{user && (
						<motion.div
							initial={{ opacity: 0, scale: 0.8 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ duration: 0.3 }}
							className="flex items-center gap-2"
						>
							<Badge className="bg-green-500/10 text-green-700 border-green-500/20">
								<CheckCircle2 className="h-3 w-3 mr-1" />
								مسجل كـ {user.name || user.email}
							</Badge>
						</motion.div>
					)}
				</div>
				<p className="text-center md:text-right">
					{user 
						? `مرحباً ${user.name || user.email}! منصة تنظيم الوقت والنصائح والإحصائيات لثالثة ثانوي`
						: "منصة تنظيم الوقت والنصائح والإحصائيات لثالثة ثانوي"
					}
				</p>
			</div>
		</footer>
	);
} 