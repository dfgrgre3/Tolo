"use client";

import { memo } from "react";
import { motion } from "framer-motion";

function AccountHeader() {
	return (
		<motion.header
			className="mb-8 space-y-2"
			initial={{ opacity: 0, y: -20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
		>
			<h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
				إدارة الحساب
			</h1>
			<p className="text-muted-foreground text-lg">إدارة معلوماتك الشخصية وإعدادات الحساب والأمان</p>
		</motion.header>
	);
}

export default memo(AccountHeader);

