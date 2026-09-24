'use client';

import { useRouter } from 'next/navigation';
import { SupportErrorState } from './support-ui';

/**
 * Retry affordance for server-rendered support segments (article/FAQ/status).
 *
 * `router.refresh()` re-runs the RSC render in place — no full reload, no
 * animation — so a transient backend failure can be retried without losing the
 * user's position or re-downloading the client bundle.
 */
export function SupportServerRetry({ message }: { message: string }) {
    const router = useRouter();
    return <SupportErrorState message={message} onRetry={() => router.refresh()} />;
}
