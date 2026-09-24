import { S } from './_components/support-design';

/**
 * Route-level loading state for every Help Center segment.
 *
 * Deliberately animation-free (no pulse/shimmer): static blocks only, matching
 * the support design language. Streaming this shell instantly means navigation
 * never waits on the backend round-trip to show meaningful structure.
 */
export default function SupportLoading() {
    return (
        <div className={S.page} dir="rtl" aria-busy="true" aria-label="جارٍ تحميل مركز المساعدة">
            <div className={S.container}>
                <section className={S.section}>
                    <div className={`h-8 w-56 ${S.skeleton}`} />
                    <div className={`mt-3 h-4 w-80 max-w-full ${S.skeleton}`} />
                    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {Array.from({ length: 8 }).map((_, index) => (
                            <div key={index} className={`h-24 ${S.skeleton}`} />
                        ))}
                    </div>
                </section>
                <section className={S.section}>
                    <div className={`h-5 w-40 ${S.skeleton}`} />
                    <div className="mt-4 space-y-3">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <div key={index} className={`h-16 ${S.skeleton}`} />
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
