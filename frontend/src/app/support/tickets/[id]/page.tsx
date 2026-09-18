'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { supportService, type SupportTicket, type SupportTicketMessage } from '@/services/api/support-service';
import { S } from '../../_components/support-design';
import { PriorityBadge, SlaBadge, StatusBadge, SupportErrorState, SupportSkeleton } from '../../_components/support-ui';

const SENDER_LABELS: Record<string, string> = {
    user: 'أنت',
    admin: 'فريق الدعم',
    system: 'النظام',
};

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [ticket, setTicket] = useState<SupportTicket | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reply, setReply] = useState('');
    const [sending, setSending] = useState(false);
    const [actionMsg, setActionMsg] = useState<string | null>(null);
    const [rating, setRating] = useState(0);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const t = await supportService.getMyTicket(id);
                if (!cancelled) setTicket(t);
            } catch {
                if (!cancelled) setError('تعذّر تحميل التذكرة. قد تكون محذوفة أو غير مصرح لك بعرضها.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [id, reloadKey]);

    function reload() {
        setReloadKey((k) => k + 1);
    }

    async function sendReply(e: React.FormEvent) {
        e.preventDefault();
        if (sending || !reply.trim() || !ticket) return;
        setSending(true);
        setActionMsg(null);
        try {
            const msg: SupportTicketMessage = await supportService.replyToTicket(ticket.id, { body: reply.trim() });
            setTicket({ ...ticket, messages: [...(ticket.messages ?? []), msg] });
            setReply('');
        } catch {
            setActionMsg('تعذّر إرسال الرد. حاول مجدداً.');
        } finally {
            setSending(false);
        }
    }

    async function doAction(fn: () => Promise<void>, ok: string, fail: string) {
        if (!ticket) return;
        setActionMsg(null);
        try {
            await fn();
            setActionMsg(ok);
            reload();
        } catch {
            setActionMsg(fail);
        }
    }

    async function submitRating() {
        if (!ticket || rating < 1) return;
        await doAction(
            () => supportService.rateTicket(ticket.id, { score: rating }),
            'شكراً! تم تسجيل تقييمك.',
            'تعذّر تسجيل التقييم.',
        );
    }

    const canReply = ticket && ticket.status !== 'closed' && ticket.status !== 'resolved';
    const canClose = ticket && ['open', 'in_progress', 'waiting_for_user', 'resolved'].includes(ticket.status);
    const canReopen = ticket && ['resolved', 'closed'].includes(ticket.status);
    const canRate = ticket && (ticket.status === 'resolved' || ticket.status === 'closed') && !ticket.satisfactionRating;

    return (
        <div className={S.page} dir="rtl">
            <div className={S.narrow}>
                <section className={S.section}>
                    <Link href="/support/tickets" className={S.viewAll}>→ العودة إلى تذاكري</Link>
                    {loading ? (
                        <div className="mt-5"><SupportSkeleton lines={5} /></div>
                    ) : error || !ticket ? (
                        <div className="mt-5"><SupportErrorState message={error ?? 'التذكرة غير موجودة'} onRetry={reload} /></div>
                    ) : (
                        <div className="mt-5">
                            <div className={`${S.card} p-5 sm:p-6`}>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={S.mono} dir="ltr">{ticket.ticketNumber}</span>
                                    <StatusBadge status={ticket.status} />
                                    <PriorityBadge priority={ticket.priority} />
                                    <SlaBadge status={ticket.slaStatus} />
                                </div>
                                <h1 className="mt-3 text-2xl font-black tracking-tight">{ticket.subject}</h1>
                                {ticket.resolveDueAt && ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                                    <p className={`${S.caption} mt-2`}>
                                        موعد الحل المتوقع: {new Date(ticket.resolveDueAt).toLocaleDateString('ar-EG')}
                                        {ticket.firstResponseAt == null && ticket.firstResponseDueAt && (
                                            <> • موعد أول رد: {new Date(ticket.firstResponseDueAt).toLocaleDateString('ar-EG')}</>
                                        )}
                                    </p>
                                )}
                                <p className={`${S.caption} mt-2`}>
                                    أُنشئت: {new Date(ticket.createdAt).toLocaleDateString('ar-EG')} • آخر تحديث: {new Date(ticket.updatedAt).toLocaleDateString('ar-EG')}
                                </p>
                                {ticket.assignedToName && <p className={`${S.caption} mt-1`}>المسؤول: {ticket.assignedToName}</p>}
                            </div>

                            <div className="mt-5 space-y-3" aria-live="polite" aria-label="المحادثة">
                                {(ticket.messages ?? []).map((m) => (
                                    <div
                                        key={m.id}
                                        className={
                                            m.senderRole === 'user'
                                                ? 'rounded-[12px] border border-[#0F766E]/40 bg-[#0F766E]/5 dark:bg-orange-500/5 dark:border-orange-500/30 p-4'
                                                : m.senderRole === 'system'
                                                  ? 'rounded-[12px] border border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-900 p-3 text-xs text-[#64748B] dark:text-slate-400'
                                                  : `${S.card} p-4`
                                        }
                                    >
                                        <div className="mb-1 flex items-center justify-between text-xs">
                                            <span className="font-bold">{SENDER_LABELS[m.senderRole] ?? m.senderName}</span>
                                            <time className={S.caption}>{new Date(m.createdAt).toLocaleString('ar-EG')}</time>
                                        </div>
                                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.message}</p>
                                    </div>
                                ))}
                                {(ticket.messages ?? []).length === 0 && (
                                    <p className="text-sm text-[#64748B] dark:text-slate-400">لا توجد رسائل بعد.</p>
                                )}
                            </div>

                            {canReply && (
                                <form onSubmit={sendReply} className={`${S.card} mt-5 p-5`}>
                                    <label htmlFor="reply" className={S.label}>ردّك</label>
                                    <textarea
                                        id="reply"
                                        value={reply}
                                        onChange={(e) => setReply(e.target.value)}
                                        rows={4}
                                        maxLength={20000}
                                        placeholder="اكتب ردّك هنا…"
                                        className={`${S.input} resize-none`}
                                    />
                                    <button type="submit" disabled={sending || !reply.trim()} className={`${S.btnPrimary} mt-3`}>
                                        {sending ? 'جارٍ الإرسال…' : 'إرسال الرد'}
                                    </button>
                                </form>
                            )}

                            <div className="mt-4 flex flex-wrap gap-2">
                                {canClose && (
                                    <button type="button" onClick={() => doAction(() => supportService.closeTicket(ticket.id), 'تم إغلاق التذكرة.', 'تعذّر إغلاق التذكرة.')} className={S.btnSecondary}>
                                        إغلاق التذكرة
                                    </button>
                                )}
                                {canReopen && (
                                    <button type="button" onClick={() => doAction(() => supportService.reopenTicket(ticket.id), 'تمت إعادة فتح التذكرة.', 'تعذّر إعادة فتح التذكرة.')} className={S.btnSecondary}>
                                        إعادة فتح التذكرة
                                    </button>
                                )}
                            </div>

                            {canRate && (
                                <div className={`${S.card} mt-4 p-5`}>
                                    <p className="text-sm font-bold">قيّم تجربة الدعم (1 - 5)</p>
                                    <div className="mt-3 flex items-center gap-2" role="radiogroup" aria-label="التقييم">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <button
                                                key={s}
                                                type="button"
                                                role="radio"
                                                aria-checked={rating === s}
                                                aria-label={`${s} من 5`}
                                                onClick={() => setRating(s)}
                                                className={`h-10 w-10 rounded-[8px] border text-sm font-black ${rating === s ? 'border-[#0F766E] bg-[#0F766E]/10 text-[#0F766E] dark:border-orange-500 dark:bg-orange-500/10 dark:text-orange-400' : 'border-[#E2E8F0] dark:border-slate-700 text-[#64748B] dark:text-slate-400 hover:border-[#0F766E]'}`}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                        <button type="button" onClick={submitRating} disabled={rating < 1} className={`${S.btnPrimary} mr-2 !px-5 !py-2 !text-xs`}>
                                            إرسال التقييم
                                        </button>
                                    </div>
                                </div>
                            )}

                            {actionMsg && <p className="mt-4 text-sm font-bold" role="status">{actionMsg}</p>}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
