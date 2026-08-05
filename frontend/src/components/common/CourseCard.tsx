import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, Users, Clock } from 'lucide-react';

export interface CourseCardProps {
  id: string;
  title: string;
  slug: string;
  thumbnail: string;
  categoryName?: string;
  instructorName?: string;
  instructorAvatar?: string;
  ratingAvg?: number;
  reviewsCount?: number;
  studentsCount?: number;
  duration?: string;
  level?: string;
  price: number;
  discountPrice?: number;
}

export function CourseCard({
  title,
  slug,
  thumbnail,
  categoryName = 'عام',
  instructorName = 'مدرّب الكورس',
  instructorAvatar,
  ratingAvg = 4.8,
  reviewsCount = 0,
  studentsCount = 0,
  duration = '12 ساعة',
  level = 'جميع المستويات',
  price,
  discountPrice,
}: CourseCardProps) {
  const hasDiscount = discountPrice !== undefined && discountPrice < price;
  const discountPercent = hasDiscount
    ? Math.round(((price - discountPrice) / price) * 100)
    : 0;

  return (
    <Link
      href={`/courses/${slug}`}
      className="group flex flex-col bg-card border border-border rounded-[12px] overflow-hidden hover:border-primary/50 hover:shadow-xs transition-colors duration-150"
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
        <Image
          src={thumbnail || '/images/course-placeholder.jpg'}
          alt={title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover"
        />

        {/* Badges */}
        <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
          <span className="px-2.5 py-1 text-xs font-bold text-white bg-[#0F766E] rounded-md shadow-xs">
            {categoryName}
          </span>
        </div>

        {hasDiscount && (
          <div className="absolute top-3 left-3 bg-[#F59E0B] text-white px-2 py-0.5 text-xs font-extrabold rounded-md shadow-xs">
            خصم {discountPercent}%
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4">
        {/* Title */}
        <h3 className="text-base font-bold text-foreground line-clamp-2 mb-2 group-hover:text-[#0F766E] transition-colors duration-150">
          {title}
        </h3>

        {/* Instructor */}
        <div className="flex items-center gap-2 mb-3">
          <div className="relative h-6 w-6 rounded-full overflow-hidden bg-slate-200 shrink-0">
            {instructorAvatar ? (
              <Image src={instructorAvatar} alt={instructorName} fill className="object-cover" />
            ) : (
              <div className="h-full w-full bg-[#0F766E] text-white text-[10px] font-bold flex items-center justify-center">
                {instructorName.charAt(0)}
              </div>
            )}
          </div>
          <span className="text-xs text-muted-foreground font-medium truncate">{instructorName}</span>
        </div>

        {/* Rating & Stats */}
        <div className="flex items-center justify-between text-xs text-muted-foreground border-y border-border/60 py-2.5 mb-3 mt-auto">
          <div className="flex items-center gap-1 text-[#F59E0B] font-bold">
            <Star className="h-3.5 w-3.5 fill-[#F59E0B]" />
            <span>{ratingAvg.toFixed(1)}</span>
            <span className="text-muted-foreground font-normal">({reviewsCount})</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span>{studentsCount}</span>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{duration}</span>
            </span>
          </div>
        </div>

        {/* Footer & Price */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground bg-slate-100 px-2 py-0.5 rounded">
            {level}
          </span>

          <div className="flex items-baseline gap-1.5 dir-ltr">
            {hasDiscount ? (
              <>
                <span className="text-base font-black text-[#0F766E]">{discountPrice} ج.م</span>
                <span className="text-xs text-muted-foreground line-through">{price} ج.م</span>
              </>
            ) : (
              <span className="text-base font-black text-[#0F766E]">
                {price > 0 ? `${price} ج.م` : 'مجاناً'}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export function CourseCardSkeleton() {
  return (
    <div className="flex flex-col bg-card border border-border rounded-[12px] overflow-hidden animate-pulse">
      <div className="aspect-video w-full bg-slate-200" />
      <div className="p-4 flex flex-col gap-3">
        <div className="h-5 bg-slate-200 rounded w-3/4" />
        <div className="h-4 bg-slate-200 rounded w-1/2" />
        <div className="h-8 bg-slate-100 rounded w-full my-2" />
        <div className="flex justify-between items-center">
          <div className="h-4 bg-slate-200 rounded w-1/4" />
          <div className="h-5 bg-slate-200 rounded w-1/3" />
        </div>
      </div>
    </div>
  );
}
