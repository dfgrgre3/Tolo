import type { Metadata } from 'next';
import Link from 'next/link';
import {
    LifeBuoy,
    Search,
    Ticket,
    MessageSquare,
    Bug,
    Lightbulb,
    Activity,
    CircleHelp,
} from 'lucide-react';
import { SITE } from '@thanawy/shared/site-config';
import { loadSupportHomeData } from '@/lib/support/support-server';
import { SUPPORT_SEARCH_MAX_LENGTH } from '@/lib/support/validation';
import { S } from './_components/support-design';
import { SupportHomeClient } from './_components/home-client';

export const metadata: Metadata = {
    title: `الدعم والمساعدة | ${SITE.name}`,
    description: `مركز المساعدة: إجابات فورية، مقالات، تذاكر دعم، وحالة النظام في ${SITE.name}.`,
    alternates: { canonical: `${SITE.url}/support` },
};

const QUICK_ACTIONS = [
    { href: '/support/tickets/new', icon: <Ticket className="h-6 w-6" />, title: 'فتح تذكرة', desc: 'تواصل مع فريق الدعم' },
    { href: '/support/tickets', icon: <MessageSquare className="h-6 w-6" />, title: 'تذاكري', desc: 'تابع طلباتك السابقة' },
    { href: '/support/faq', icon: <CircleHelp className="h-6 w-6" />, title: 'الأسئلة الشائعة', desc: 'إجابات فورية' },
    { href: '/support/search', icon: <Search className="h-6 w-6" />, title: 'البحث', desc: 'ابحث في المقالات' },
    { href: '/support/bug-report', icon: <Bug className="h-6 w-6" />, title: 'بلاغ عن مشكلة', desc: 'أبلغ عن خطأ تقني' },
    { href: '/support/feature-request', icon: <Lightbulb className="h-6 w-6" />, title: 'اقتراح ميزة', desc: 'شاركنا أفكارك' },
    { href: '/support/status', icon: <Activity className="h-6 w-6" />, title: 'حالة النظام', desc: 'تابع الأعطال والصيانة' },
    { href: '/contact', icon: <LifeBuoy className="h-6 w-6" />, title: 'اتصل بنا', desc: 'قنوات التواصل المباشر' },
];

export default async function SupportHomePage() {
    // The landing page ships with its content already in the HTML (SEO + faster
    // first paint); the client queries only refresh it in the background.
    const { popular, status } = await loadSupportHomeData();

    return (
        <div className={S.page} dir="rtl">
            {/* Hero — same language as the homepage hero */}
            <section className={S.hero}>
                <div className={S.container}>
                    <div className="max-w-2xl">
                        <span className={S.heroBadge}>
                            <LifeBuoy className="h-4 w-4 text-[#F59E0B]" />
                            مركز المساعدة
                        </span>
                        <h1 className={S.heroTitle}>
                            كيف نقدر <span className={S.heroAccent}>نساعدك؟</span>
                        </h1>
                        <p className={S.heroSub}>
                            ابحث في المقالات والأسئلة الشائعة، أو افتح تذكرة وسيرد عليك فريق الدعم.
                        </p>
                        <form action="/support/search" method="get" className="mt-5 flex items-center gap-2 max-w-xl" role="search">
                            <div className="relative flex-1">
                                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#64748B]" />
                                <label htmlFor="support-search" className="sr-only">ابحث في المساعدة</label>
                                <input
                                    id="support-search"
                                    name="q"
                                    type="search"
                                    placeholder="ابحث عن إجابة… (مثال: استرداد، شهادة، كلمة المرور)"
                                    className={S.searchInput}
                                    maxLength={SUPPORT_SEARCH_MAX_LENGTH}
                                    autoComplete="off"
                                />
                            </div>
                            <button type="submit" className={S.searchBtn}>
                                بحث
                            </button>
                        </form>
                    </div>
                </div>
            </section>

            <div className={S.container}>
                {/* Quick actions */}
                <section className={S.section} aria-label="إجراءات سريعة">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {QUICK_ACTIONS.map((a) => (
                            <Link
                                key={a.href + a.title}
                                href={a.href}
                                className={`group flex flex-col ${S.card} ${S.cardHover} ${S.cardPad}`}
                            >
                                <span className="text-[#0F766E] dark:text-orange-500">{a.icon}</span>
                                <span className="mt-3 text-base font-bold text-[#1E293B] dark:text-white group-hover:text-[#0F766E] dark:group-hover:text-orange-500">
                                    {a.title}
                                </span>
                                <span className="mt-1 text-xs text-[#64748B] dark:text-slate-400 font-medium">{a.desc}</span>
                            </Link>
                        ))}
                    </div>
                </section>

                <SupportHomeClient initialPopular={popular} initialStatus={status} />
            </div>
        </div>
    );
}
