import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ChevronLeft, Users } from 'lucide-react';
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
    <section className="py-16 bg-white border-y border-[#E2E8F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#1E293B]">أفضل المدربين والخبراء</h2>
            <p className="text-sm text-[#64748B] font-medium mt-1">
              نخبة من المتخصصين لنقل خبراتهم إليك مباشرة
            </p>
          </div>
          <button
            onClick={() => router.push('/instructors')}
            className="flex items-center gap-1 text-sm font-bold text-[#0F766E] hover:text-[#115E59] transition-colors"
          >
            عرض الكل <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <InstructorSkeleton key={i} />
            ))}
          </div>
        ) : instructors.length === 0 ? (
          <div className="text-center py-12 text-sm text-[#64748B]">
            لا يوجد مدربون متاحون حالياً.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {instructors.map((ins) => {
              const name =
                ins.name || `${ins.firstName || ''} ${ins.lastName || ''}`.trim() || 'مدرب';
              const avatar = ins.profileImage || ins.avatar;
              const initial = name.charAt(0);

              return (
                <button
                  key={ins.id}
                  onClick={() => router.push(`/instructors/${ins.id}`)}
                  className="bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#0F766E] p-4 rounded-[12px] text-center flex flex-col items-center hover:shadow-md group transition-colors"
                >
                  <div className="relative h-16 w-16 rounded-full overflow-hidden mb-3 ring-2 ring-[#E2E8F0] group-hover:ring-[#0F766E]">
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
