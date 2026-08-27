'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ChevronLeft, Users, Star } from 'lucide-react';
import { CONTAINER, TYPOGRAPHY, SECTION_HEADER, CARD_DIMENSIONS, RAIL } from '../design-system';
import type { Instructor } from '../types';

interface BestTeachersSectionProps {
  instructors: Instructor[];
  loading: boolean;
}

/**
 * Skeleton for instructor loading state
 */
function InstructorSkeleton() {
  return (
    <div className={`bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 ${CARD_DIMENSIONS.instructor.borderRadius} ${CARD_DIMENSIONS.instructor.padding}`}>
      <div className="h-16 w-16 rounded-full bg-slate-200 dark:bg-slate-700 mb-3 mx-auto" />
      <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded mb-2 mx-auto" />
      <div className="h-3 w-16 bg-slate-100 dark:bg-slate-700 rounded mx-auto" />
    </div>
  );
}

/**
 * BestTeachersSection showcases top-rated instructors
 *
 * Features:
 * - Standardized instructor cards
 * - Rating display
 * - Students count
 * - Loading skeletons
 * - Empty state handling
 */
export function BestTeachersSection({ instructors, loading }: BestTeachersSectionProps) {
  const router = useRouter();

  if (!instructors.length && !loading) {
    return null;
  }

  return (
    <section className="py-10 bg-gradient-to-b from-white to-[#F8FAFC] border-b border-[#E2E8F0] dark:from-slate-900 dark:to-slate-950 dark:border-slate-800">
      <div className={CONTAINER.className}>
        <div className={SECTION_HEADER.container}>
          <div className={SECTION_HEADER.content}>
            <h2 className={TYPOGRAPHY.sectionHeading}>
              ⭐ أفضل المدرسين
            </h2>
            <p className={TYPOGRAPHY.sectionSubheading}>
              تعلم من أفضل المتخصصين والخبراء في مجالاتهم
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
        ) : (
          <div className={RAIL.container}>
            {instructors.map((ins) => {
              const name = ins.name || `${ins.firstName || ''} ${ins.lastName || ''}`.trim() || 'مدرس';
              const avatar = ins.profileImage || ins.avatar;
              const initial = name.charAt(0);

              return (
                <button
                  key={ins.id}
                  onClick={() => router.push(`/instructors/${ins.id}`)}
                  className={`
                    ${RAIL.item} w-40
                    bg-white dark:bg-slate-800
                    border border-[#E2E8F0] dark:border-slate-700
                    hover:border-[#0F766E] dark:hover:border-orange-500
                    ${CARD_DIMENSIONS.instructor.padding}
                    ${CARD_DIMENSIONS.instructor.borderRadius}
                    text-center flex flex-col items-center
                    hover:shadow-md dark:hover:shadow-orange-500/20
                    group transition-all duration-150
                  `}
                >
                  {/* Avatar */}
                  <div className={`
                    relative ${CARD_DIMENSIONS.instructor.avatarSize}
                    ${CARD_DIMENSIONS.instructor.avatarBorderRadius}
                    overflow-hidden mb-3
                    ring-2 ring-[#E2E8F0] dark:ring-slate-700
                    group-hover:ring-[#0F766E] dark:group-hover:ring-orange-500
                  `}>
                    {avatar ? (
                      <Image src={avatar} alt={name} fill className="object-cover" />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-[#0F766E] to-emerald-500 dark:from-orange-500 dark:to-orange-600 text-white font-bold flex items-center justify-center text-xl">
                        {initial}
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <h3 className={`${TYPOGRAPHY.cardTitle} line-clamp-1 mb-1`}>
                    {name}
                  </h3>

                  {/* Bio / Subject */}
                  <p className={`${TYPOGRAPHY.caption} line-clamp-1`}>
                    {ins.bio
                      ? ins.bio.slice(0, 30) + (ins.bio.length > 30 ? '...' : '')
                      : 'مدرس معتمد'}
                  </p>

                  {/* Stats Row */}
                  <div className="flex items-center justify-center gap-3 mt-3 pt-3 border-t border-[#E2E8F0] dark:border-slate-700 w-full text-[10px] text-[#64748B] dark:text-slate-400">
                    {ins.rating !== undefined && ins.rating > 0 && (
                      <div className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-[#F59E0B] text-[#F59E0B]" />
                        <span className="font-bold">{ins.rating.toFixed(1)}</span>
                      </div>
                    )}
                    {ins.studentsCount !== undefined && ins.studentsCount > 0 && (
                      <div className="flex items-center gap-0.5">
                        <Users className="h-3 w-3" />
                        <span>{ins.studentsCount.toLocaleString('ar-EG')}</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
