"use client";

import React, { useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Languages, Check } from "lucide-react";
import { Button } from "@/shared/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface Language {
	code: string;
	name: string;
	nativeName: string;
	flag: string;
}

const languages: Language[] = [
	{ code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦" },
	{ code: "en", name: "English", nativeName: "English", flag: "🇺🇸" },
	{ code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
];

export function LanguageSwitch() {
	const router = useRouter();
	const pathname = usePathname();
	const [currentLang, setCurrentLang] = useState<string>("ar");
	const [isOpen, setIsOpen] = useState(false);

	// Detect current language from pathname
	React.useEffect(() => {
		const langMatch = pathname?.match(/^\/([a-z]{2})/);
		if (langMatch) {
			setCurrentLang(langMatch[1]);
		}
	}, [pathname]);

	const handleLanguageChange = useCallback(
		(langCode: string) => {
			if (langCode === currentLang) {
				setIsOpen(false);
				return;
			}

			setCurrentLang(langCode);
			setIsOpen(false);

			// Update URL with new language
			const newPath = pathname?.replace(/^\/[a-z]{2}/, `/${langCode}`) || `/${langCode}`;
			router.push(newPath);

			// Save preference
			try {
				localStorage.setItem("preferred_language", langCode);
			} catch (e) {
				// Ignore
			}
		},
		[currentLang, pathname, router]
	);

	const currentLanguage = languages.find((lang) => lang.code === currentLang) || languages[0];

	return (
		<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="h-9 w-9"
					aria-label="تغيير اللغة"
					title="تغيير اللغة"
				>
					<Languages className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56" sideOffset={8}>
				<DropdownMenuLabel className="flex items-center gap-2">
					<Languages className="h-4 w-4 text-primary" />
					<span>اختر اللغة</span>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<div className="p-1">
					{languages.map((language) => {
						const isSelected = language.code === currentLang;
						return (
							<DropdownMenuItem
								key={language.code}
								onClick={() => handleLanguageChange(language.code)}
								className={cn(
									"flex items-center gap-3 p-2.5 rounded-lg cursor-pointer",
									"hover:bg-accent transition-colors",
									isSelected && "bg-primary/10"
								)}
							>
								<span className="text-2xl shrink-0">{language.flag}</span>
								<div className="flex-1 min-w-0 text-right">
									<div className="text-sm font-medium text-foreground">{language.nativeName}</div>
									<div className="text-xs text-muted-foreground">{language.name}</div>
								</div>
								{isSelected && (
									<motion.div
										initial={{ scale: 0 }}
										animate={{ scale: 1 }}
										className="text-primary shrink-0"
									>
										<Check className="h-4 w-4" />
									</motion.div>
								)}
							</DropdownMenuItem>
						);
					})}
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

