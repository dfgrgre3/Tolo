'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { supportService } from '@/services/api/support-service';
import { S } from '../../_components/support-design';

const NO_REASONS = ['غير واضح', 'لم يحل المشكلة', 'مشكلة مختلفة', 'أحتاج دعم بشري'];

export function ArticleVote({ slug }: { slug: string }) {
    const [state, setState] = useState<'idle' | 'reasons' | 'done' | 'error'>('idle');
    const [sending, setSending] = useState(false);

    async function vote(helpful: boolean, reason?: string) {
        if (sending) return;
        setSending(true);
        try {
            await supportService.voteArticle(slug, helpful, reason);
            setState('done');
        } catch {
            setState('error');
        } finally {
            setSending(false);
        }
    }

    if (state === 'done') {
        return (
            <p className={`${S.alertSuccess} mt-6 !p-4 text-sm font-bold text-[#0F766E] dark:text-green-400`} role="status">
                شكراً لك! تم تسجيل تقييمك.
            </p>
        );
    }

    return (
        <div className={`${S.card} mt-6 p-6 text-center`}>
            <p className="font-black">هل كانت هذه المقالة مفيدة؟</p>
            {state !== 'reasons' ? (
                <div className="mt-4 flex justify-center gap-3">
                    <button
                        type="button"
                        disabled={sending}
                        onClick={() => vote(true)}
                        className="inline-flex items-center gap-2 rounded-[8px] border border-emerald-200 bg-emerald-50 px-6 py-2 text-sm font-bold text-[#0F766E] hover:bg-emerald-100 disabled:opacity-50 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-400 dark:hover:bg-green-500/20"
                    >
                        <ThumbsUp className="h-4 w-4" /> نعم
                    </button>
                    <button
                        type="button"
                        disabled={sending}
                        onClick={() => setState('reasons')}
                        className="inline-flex items-center gap-2 rounded-[8px] border border-red-200 bg-red-50 px-6 py-2 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                    >
                        <ThumbsDown className="h-4 w-4" /> لا
                    </button>
                </div>
            ) : (
                <div className="mx-auto mt-4 grid max-w-md grid-cols-2 gap-2">
                    {NO_REASONS.map((r) => (
                        <button
                            key={r}
                            type="button"
                            disabled={sending}
                            onClick={() => vote(false, r)}
                            className={`${S.btnSecondary} disabled:opacity-50`}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            )}
            {state === 'error' && <p className="mt-3 text-xs font-bold text-red-600 dark:text-red-400" role="alert">تعذّر تسجيل التقييم. حاول مجدداً.</p>}
        </div>
    );
}
