"use client";

import { m } from "framer-motion";

export function LoadingState() {
	return (
		<div className="flex flex-col items-center justify-center py-32 h-[50vh]">
			<div className="relative mb-6">
				<m.div 
					className="w-20 h-20 rounded-full border-4 border-primary/20"
				/>
				<m.div 
					className="w-20 h-20 rounded-full border-4 border-primary border-t-transparent absolute top-0 left-0"
					animate={{ rotate: 360 }}
					transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
				/>
				<m.div 
					className="text-3xl absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
					animate={{ scale: [0.8, 1.1, 0.8] }}
					transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
				>
					ًںڈ†
				</m.div>
			</div>
			
			<div className="space-y-2 text-center">
				<h3 className="text-xl font-bold bg-gradient-to-l from-primary to-primary/60 bg-clip-text text-transparent">
					جاري تجهيز سجل الإنجازات...
				</h3>
				<p className="text-sm text-muted-foreground font-medium animate-pulse">
					نجمع بيانات تفوقك ونجاحاتك
				</p>
			</div>
		</div>
	);
}
