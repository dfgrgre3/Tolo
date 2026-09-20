/**
 * Support pages visual language — mirrors the homepage guest design system
 * (app/components/home/guest/design-system.ts).
 *
 * Rules for every support page:
 * - Light-first: white cards on #F8FAFC, dark via slate palette.
 * - Brand: teal #0F766E primary, amber #F59E0B accent (orange-500 in dark).
 * - NO animation: never use transition-*, duration-*, animate-*,
 *   hover:-translate-*, hover:scale-*, or group-hover:scale-*.
 *   Instant :hover state changes (bg / border / text color) are allowed.
 */

export const S = {
    page: 'min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-[#1E293B] dark:text-white font-sans',
    container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
    narrow: 'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8',
    formWrap: 'max-w-2xl mx-auto px-4 sm:px-6 lg:px-8',

    hero: 'relative bg-gradient-to-br from-[#0F766E] via-[#0e7280] to-[#1e3a5f] overflow-hidden pt-10 pb-12',
    heroBadge:
        'inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm font-bold text-white/90',
    heroTitle: 'mt-5 text-3xl sm:text-4xl lg:text-5xl font-black leading-tight tracking-tight text-white',
    heroAccent: 'text-[#F59E0B]',
    heroSub: 'mt-3 text-base sm:text-lg text-white/80 max-w-2xl leading-relaxed',

    section: 'py-10',
    sectionTitle: 'text-2xl sm:text-3xl font-black text-[#1E293B] dark:text-white',
    sectionSub: 'text-sm text-[#64748B] dark:text-slate-400 font-medium mt-1',
    sectionHead: 'flex flex-row items-center justify-between gap-4 mb-5',
    viewAll:
        'flex items-center gap-1 text-sm font-bold text-[#0F766E] hover:text-[#115E59] dark:text-orange-500 dark:hover:text-orange-400 whitespace-nowrap shrink-0',

    card: 'bg-transparent border-0 border-t border-[#E2E8F0] dark:border-slate-800',
    cardHover: 'hover:bg-black/[0.02] dark:hover:bg-white/[0.03]',
    cardPad: 'py-6 px-0 sm:px-2',

    btnPrimary:
        'px-6 py-3 bg-[#0F766E] hover:bg-[#115E59] text-white font-bold text-sm rounded-[8px] shadow-sm dark:bg-orange-500 dark:hover:bg-orange-600 disabled:opacity-50',
    btnPrimaryLarge:
        'w-full px-8 py-4 bg-[#0F766E] hover:bg-[#115E59] text-white font-black text-base rounded-[8px] shadow-sm dark:bg-orange-500 dark:hover:bg-orange-600 disabled:opacity-50',
    btnSecondary:
        'px-6 py-2 bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F766E] font-bold text-sm rounded-[8px] dark:bg-slate-800 dark:border-slate-700 dark:text-orange-500',

    input:
        'w-full px-4 py-3 rounded-[8px] border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#1E293B] dark:text-white text-sm placeholder:text-[#94A3B8] dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/40 focus:border-[#0F766E] dark:focus:border-orange-500 dark:focus:ring-orange-500/30',
    label: 'mb-2 block text-sm font-bold text-[#1E293B] dark:text-white',
    helper: 'text-xs text-[#64748B] dark:text-slate-400',

    searchInput:
        'w-full pl-4 pr-11 py-4 bg-white rounded-xl text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#F59E0B] shadow-lg',
    searchBtn:
        'px-6 py-4 bg-[#F59E0B] hover:bg-[#D97706] text-white font-bold text-sm rounded-xl shrink-0 shadow-lg',

    chip:
        'inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm font-bold text-white/90',

    filterActive:
        'rounded-full border px-4 py-2 text-xs font-bold border-[#0F766E] bg-[#0F766E]/10 text-[#0F766E] dark:border-orange-500 dark:bg-orange-500/10 dark:text-orange-400',
    filterIdle:
        'rounded-full border px-4 py-2 text-xs font-bold border-[#E2E8F0] dark:border-slate-700 text-[#64748B] dark:text-slate-400 hover:border-[#0F766E] dark:hover:border-orange-500 bg-white dark:bg-slate-900',

    faqItem:
        'border-0 border-t border-[#E2E8F0] dark:border-slate-700 bg-transparent',
    faqQuestion:
        'w-full py-4 flex items-start justify-between bg-transparent hover:bg-black/[0.02] dark:hover:bg-white/[0.03] text-right cursor-pointer list-none',
    faqAnswer: 'pb-5 text-sm leading-relaxed text-[#64748B] dark:text-slate-400',

    alertError:
        'rounded-[12px] border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-500/20 dark:bg-red-500/5 dark:text-red-400',
    alertSuccess:
        'rounded-[12px] border border-emerald-200 bg-emerald-50 p-8 text-center dark:border-green-500/20 dark:bg-green-500/5',
    alertWarn:
        'rounded-[12px] border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/5 dark:text-amber-400',

    emptyWrap: 'text-center py-12 bg-transparent border-0 border-t border-[#E2E8F0] dark:border-slate-800',
    skeleton: 'bg-[#E2E8F0] dark:bg-slate-800 rounded-[12px]',

    tag: 'rounded-full border border-[#E2E8F0] dark:border-slate-700 px-3 py-1 text-xs text-[#64748B] dark:text-slate-400',
    mono: 'font-mono text-xs text-[#64748B] dark:text-slate-400',
    caption: 'text-xs text-[#64748B] dark:text-slate-400 font-medium',
} as const;

const BADGE: Record<string, string> = {
    open: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
    in_progress:
        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    waiting_for_user:
        'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20',
    resolved:
        'bg-emerald-50 text-[#0F766E] border-emerald-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20',
    closed: 'bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0] dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20',
    escalated: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
    operational:
        'bg-emerald-50 text-[#0F766E] border-emerald-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20',
    degraded:
        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    partial_outage:
        'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20',
    major_outage: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
    maintenance: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
    investigating: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
    identified:
        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    monitoring: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
};

const BADGE_FALLBACK =
    'bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0] dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20';

export function badgeClass(status: string): string {
    return `inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${BADGE[status] ?? BADGE_FALLBACK}`;
}
