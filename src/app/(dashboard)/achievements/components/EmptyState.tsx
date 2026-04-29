"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Trophy, Target, ArrowRight, Sparkles } from 'lucide-react';
import { m } from "framer-motion";

export function EmptyState() {
	return (
		<m.div
			initial={{ opacity: 0, scale: 0.95 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ duration: 0.5, ease: "easeOut" }}
			className="text-center py-20 px-4 relative max-w-2xl mx-auto"
		>
			<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-[400px] max-h-[400px] bg-primary/5 rounded-full blur-[80px] -z-10" />
			
			<div className="relative inline-block mb-8 group">
				<m.div
					animate={{ rotate: [-5, 5] }}
					transition={{ 
						duration: 4, 
						repeat: Infinity, 
						repeatType: "reverse",
						ease: "easeInOut"
					}}
					className="text-8xl md:text-9xl filter drop-shadow-2xl relative z-10"
				>
					🏆
				</m.div>
				<m.div 
					className="absolute -top-4 -right-4 text-3xl"
					animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
					transition={{ duration: 2, repeat: Infinity }}
				>
					<Sparkles className="text-yellow-400 fill-yellow-400 w-10 h-10" />
				</m.div>
				<m.div 
					className="absolute top-10 -left-6 text-3xl"
					animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.8, 0.3] }}
					transition={{ duration: 3, repeat: Infinity, delay: 1 }}
				>
					<Sparkles className="text-blue-400 fill-blue-400 w-8 h-8" />
				</m.div>
			</div>
			
			<h2 className="text-3xl font-black mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">جاهز لبدء رحلة الأبطال؟</h2>
			
			<p className="text-muted-foreground text-lg mb-10 max-w-md mx-auto leading-relaxed">
				حائط إنجازاتك ينتظر أن يمتلئ بالجوائز والتفوق. ابدأ أول خطوة الآن واحصل على إنجازك الأول!
			</p>
			
			<div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
				<Button asChild size="lg" className="rounded-2xl shadow-lg shadow-primary/25 group w-full sm:w-auto h-14 px-8 text-base">
					<Link href="/tasks">
						<Target className="h-5 w-5 ml-2 transition-transform group-hover:scale-110 group-hover:-rotate-12" />
						ابدأ إنجاز المهام
						<ArrowRight className="h-5 w-5 mr-2 opacity-70 group-hover:translate-x-[-4px] transition-transform" />
					</Link>
				</Button>
				
				<Button variant="outline" size="lg" asChild className="rounded-2xl group w-full sm:w-auto h-14 px-8 text-base border-2 hover:bg-secondary/50">
					<Link href="/time">
						<Trophy className="h-5 w-5 ml-2 text-primary transition-transform group-hover:scale-110" />
						ابدأ جلسة دراسة
						<ArrowRight className="h-5 w-5 mr-2 opacity-70 group-hover:translate-x-[-4px] transition-transform" />
					</Link>
				</Button>
			</div>
		</m.div>
	);
}
