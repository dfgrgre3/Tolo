"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import {
	ArrowUp,
	ChevronLeft,
	Facebook,
	Github,
	Instagram,
	Linkedin,
	Mail,
	MapPin,
	Phone,
	Twitter,
	Youtube,
	type LucideIcon
} from "lucide-react";
import { SITE, CONTACT, LEGAL, SOCIAL, APP_VERSION } from "@thanawy/shared/site-config";

// ─── Types ───────────────────────────────────────────────────────

interface Category {
	id: string;
	slug: string;
	name?: string;
	title?: string;
}

interface FooterLink {
	href: string;
	label: string;
}

interface FooterColumn {
	title: string;
	links: readonly FooterLink[];
}

// ─── Constants ───────────────────────────────────────────────────

/** Only networks with a configured URL are rendered — no placeholder links. */
const SOCIAL_LINKS: readonly { href: string; icon: LucideIcon; label: string }[] = [
	{ href: SOCIAL.facebook, icon: Facebook, label: "فيسبوك" },
	{ href: SOCIAL.instagram, icon: Instagram, label: "إنستجرام" },
	{ href: SOCIAL.youtube, icon: Youtube, label: "يوتيوب" },
	{ href: SOCIAL.twitter, icon: Twitter, label: "تويتر" },
	{ href: SOCIAL.linkedin, icon: Linkedin, label: "لينكد إن" },
	{ href: SOCIAL.github, icon: Github, label: "جيت هاب" }
].filter((item) => item.href.length > 0);

const FOOTER_COLUMNS: readonly FooterColumn[] = [
	{
		title: "التعليم",
		links: [
			{ href: "/courses", label: "الدورات التعليمية" },
			{ href: "/my-courses", label: "دوراتي" },
			{ href: "/teachers", label: "المدرسون" },
			{ href: "/exams", label: "الامتحانات" },
			{ href: "/library", label: "المكتبة الرقمية" },
			{ href: "/resources", label: "الموارد والتحميلات" }
		]
	},
	{
		title: "المجتمع",
		links: [
			{ href: "/blog", label: "المدونة" },
			{ href: "/forum", label: "المنتدى" },
			{ href: "/events", label: "الفعاليات" },
			{ href: "/announcements", label: "الإعلانات" },
			{ href: "/leaderboard", label: "لوحة الصدارة" },
			{ href: "/tips", label: "نصائح دراسية" }
		]
	},
	{
		title: "المنصة",
		links: [
			{ href: "/about", label: "من نحن" },
			{ href: "/pathways", label: "المسارات التعليمية" },
			{ href: "/teach", label: "انضم كمدرس" },
			{ href: "/contact", label: "اتصل بنا" },
			{ href: "/faq", label: "الأسئلة الشائعة" }
		]
	},
	{
		title: "حسابك",
		links: [
			{ href: "/subscription", label: "الاشتراكات" },
			{ href: "/billing", label: "الفواتير والمحفظة" }
		]
	}
];

const CONTACT_INFO = [
	{ icon: Mail, text: CONTACT.email, href: `mailto:${CONTACT.email}` },
	{ icon: Phone, text: CONTACT.phone, href: `tel:${CONTACT.phoneTel}` },
	{ icon: MapPin, text: "القاهرة، جمهورية مصر العربية", href: null }
] as const;

const LEGAL_LINKS: readonly FooterLink[] = [
	{ href: "/terms", label: "الشروط والأحكام" },
	{ href: "/privacy", label: "سياسة الخصوصية" }
];

const CATEGORIES_STALE_TIME_MS = 10 * 60 * 1000;

const LINK_CLASS =
	"inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary outline-none focus-visible:text-primary focus-visible:underline";

// ─── Component ───────────────────────────────────────────────────

export default function Footer({ nonce }: { nonce?: string }) {
	const pathname = usePathname();

	// ✅ Hooks called unconditionally before any early return
	const { data: topCategories = [] } = useQuery<Category[]>({
		queryKey: ["footer-top-categories"],
		queryFn: async () => {
			try {
				const response = await fetch("/api/categories?limit=8");
				if (!response.ok) return [];
				const data = await response.json();
				return data.data || [];
			} catch {
				return [];
			}
		},
		staleTime: CATEGORIES_STALE_TIME_MS
	});

	// Hide footer on teaching pages
	if (pathname?.startsWith("/teaching")) {
		return null;
	}

	const currentYear = new Date().getFullYear();

	const organizationSchema = {
		"@context": "https://schema.org",
		"@type": "EducationalOrganization",
		name: SITE.name,
		alternateName: SITE.nameAr,
		legalName: LEGAL.companyNameAr,
		url: SITE.url,
		logo: `${SITE.url}${SITE.logo}`,
		description: SITE.description,
		...(SOCIAL_LINKS.length > 0 && { sameAs: SOCIAL_LINKS.map((item) => item.href) }),
		contactPoint: {
			"@type": "ContactPoint",
			contactType: "customer support",
			email: CONTACT.email,
			telephone: CONTACT.phoneTel,
			areaServed: "EG",
			availableLanguage: ["ar", "en"]
		}
	};

	return (
		<footer
			className="bg-card text-card-foreground border-t border-border pt-14 pb-8 font-sans"
			dir="rtl"
			role="contentinfo"
		>
			<script
				type="application/ld+json"
				nonce={nonce}
				dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
				suppressHydrationWarning
			/>

			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-10 mb-12">
					{/* ── Brand, Contact & Social ───────────────────── */}
					<div className="col-span-2 space-y-5">
						<Link href="/" className="flex items-center gap-3 w-fit outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg">
							<span className="relative h-10 w-10 rounded-lg overflow-hidden bg-white p-1 shrink-0">
								<Image
									src={SITE.logo}
									alt=""
									fill
									sizes="40px"
									className="object-contain"
								/>
							</span>
							<span className="flex flex-col leading-tight">
								<span className="text-xl font-black text-foreground">{SITE.name}</span>
								<span className="text-[10px] font-bold text-muted-foreground">{SITE.tagline}</span>
							</span>
						</Link>

						<p className="text-xs text-muted-foreground leading-relaxed font-medium max-w-sm">
							{SITE.description}. دورات مشروحة، بنك امتحانات، ومتابعة يومية لتقدمك حتى
							تحقيق أعلى الدرجات.
						</p>

						<ul className="space-y-2.5 text-xs font-medium">
							{CONTACT_INFO.map((item) => {
								const Icon = item.icon;
								return (
									<li key={item.text} className="flex items-center gap-2.5">
										<Icon className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
										{item.href ? (
											<a href={item.href} className={LINK_CLASS} dir="ltr">
												{item.text}
											</a>
										) : (
											<span className="text-muted-foreground">{item.text}</span>
										)}
									</li>
								);
							})}
						</ul>

						{SOCIAL_LINKS.length > 0 && (
							<div className="flex items-center gap-2.5">
								{SOCIAL_LINKS.map((social) => {
									const Icon = social.icon;
									return (
										<a
											key={social.label}
											href={social.href}
											target="_blank"
											rel="noopener noreferrer"
											className="h-9 w-9 rounded-lg bg-muted hover:bg-primary flex items-center justify-center text-muted-foreground hover:text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
											aria-label={social.label}
										>
											<Icon className="h-4 w-4" aria-hidden="true" />
										</a>
									);
								})}
							</div>
						)}
					</div>

					{/* ── Link Columns ──────────────────────────────── */}
					{FOOTER_COLUMNS.map((column) => (
						<nav key={column.title} aria-label={column.title}>
							<h3 className="text-sm font-bold text-foreground border-r-2 border-primary pr-3 mb-4">
								{column.title}
							</h3>
							<ul className="space-y-2.5 text-xs font-medium">
								{column.links.map((link) => (
									<li key={link.href}>
										<Link href={link.href} className={LINK_CLASS}>
											<ChevronLeft className="h-3 w-3 text-primary shrink-0" aria-hidden="true" />
											{link.label}
										</Link>
									</li>
								))}
							</ul>
						</nav>
					))}
				</div>

				{/* ── Study Fields (live categories) ────────────────── */}
				{topCategories.length > 0 && (
					<nav aria-label="المجالات الدراسية" className="mb-10 pt-8 border-t border-border">
						<h3 className="text-sm font-bold text-foreground mb-4">المجالات الدراسية</h3>
						<ul className="flex flex-wrap gap-2">
							{topCategories.map((cat) => (
								<li key={cat.id}>
									<Link
										href={`/courses?category=${cat.slug}`}
										className="inline-flex px-3 py-1.5 rounded-lg bg-muted text-[11px] font-bold text-muted-foreground hover:bg-primary/10 hover:text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary"
									>
										{cat.name || cat.title}
									</Link>
								</li>
							))}
						</ul>
					</nav>
				)}

				{/* ── Bottom Bar ────────────────────────────────────── */}
				<div className="pt-8 border-t border-border flex flex-col lg:flex-row items-center justify-between gap-5 text-xs text-muted-foreground">
					<p className="text-center lg:text-right font-medium">
						© {currentYear} {LEGAL.companyNameAr}. جميع الحقوق محفوظة.
					</p>

					<div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-medium">
						{LEGAL_LINKS.map((link) => (
							<Link key={link.href} href={link.href} className={LINK_CLASS}>
								{link.label}
							</Link>
						))}
						<span className="text-muted-foreground">الإصدار {APP_VERSION}</span>
						<button
							type="button"
							onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
							className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-muted font-bold hover:bg-primary hover:text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
						>
							<ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
							العودة لأعلى
						</button>
					</div>
				</div>
			</div>
		</footer>
	);
}
