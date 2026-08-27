import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ChevronLeft, Users } from 'lucide-react';
import { CONTAINER, TYPOGRAPHY, SECTION_HEADER, RAIL } from '../design-system';
import type { Instructor } from '../types';

interface InstructorsSectionProps {
  instructors: Instructor[];
  loading: boolean;
}

/** A single placeholder card shown while instructors load. */
export function InstructorSkeleton() {
  return (
    <div className="flex flex-col items-center p-4 bg-white border border-[#E2E8F0] rounded-[12px]">
      <div className="h-16 w-16 rounded-full bg-slate-200 mb-3" />
      <div className="h-3 w-20 bg-slate-200 rounded mb-2" />
      <div className="h-2 w-16 bg-slate-100 rounded" />
    </div>
  );
}

export function InstructorsSection({ instructors, loading }: InstructorsSectionProps) {
  const router = useRouter();

  return (
    <section className="py-10 bg-white border-y border-[#E2E8F0]">
      <div className={CONTAINER.className}>
        <div className={SECTION_HEADER.container}>
          <div className={SECTION_HEADER.content}>
            <h2 className={TYPOGRAPHY.sectionHeading}>أفضل المدربين والخبراء</h2>
            <p className={TYPOGRAPHY.sectionSubheading}>
              نخبة من المتخصصين لنقل خبراتهم إليك مباشرة
            </p>
          </div>
          <button
            onClick={() => router.push('/instructors')}
            className={SECTION_HEADER.viewAllButton}
          >
            عرض الكل <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className={RAIL.container}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`${RAIL.item} w-40`}>
                <InstructorSkeleton />
              </div>
            ))}
          </div>
        ) : instructors.length === 0 ? (
          <div className="text-center py-12 text-sm text-[#64748B]">
            لا يوجد مدربون متاحون حالياً.
          </div>
        ) : (
          <div className={RAIL.container}>
            {instructors.map((ins) => {
              const name =
                ins.name || `${ins.firstName || ''} ${ins.lastName || ''}`.trim() || 'مدرب';
              const avatar = ins.profileImage || ins.avatar;
              const initial = name.charAt(0);

              return (
                <button
                  key={ins.id}
                  onClick={() => router.push(`/instructors/${ins.id}`)}
                  className={`${RAIL.item} w-40 bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#0F766E] p-4 rounded-[12px] text-center flex flex-col items-center hover:shadow-md group transition-all duration-150`}
                >
                  <div className="relative h-16 w-16 rounded-full overflow-hidden mb-2.5 ring-2 ring-[#E2E8F0] group-hover:ring-[#0F766E]">
                    {avatar ? (
                      <Image src={avatar} alt={name} fill className="object-cover" />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-[#0F766E] to-emerald-500 text-white font-bold flex items-center justify-center text-xl">
                        {initial}
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-[#1E293B] group-hover:text-[#0F766E] line-clamp-1">
                    {name}
                  </h3>
                  <p className="text-xs text-[#64748B] line-clamp-1 mt-1 font-medium">
                    {ins.bio
                      ? ins.bio.slice(0, 30) + (ins.bio.length > 30 ? '...' : '')
                      : 'مدرب معتمد'}
                  </p>
                  {ins.studentsCount !== undefined && ins.studentsCount > 0 && (
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-[#64748B]">
                      <Users className="h-3 w-3" />
                      {ins.studentsCount.toLocaleString('ar-EG')} طالب
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
