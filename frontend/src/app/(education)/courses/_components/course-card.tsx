"use client";

import Image from "next/image";
import Link from "next/link";
import { m } from "framer-motion";
import { useState } from "react";
import {
  ArrowLeft,
  GraduationCap,
  Heart,
  Layers3,
  PlayCircle,
  ShoppingCart,
  Star,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { levelMap } from "./constants";
import { formatPrice, formatHours } from "./utils";
import type { CourseSummary } from "./types";

export function CourseCard({
  course,
  index,
}: {
  course: CourseSummary;
  index: number;
}) {
  const levelInfo = levelMap[course.level] ?? levelMap.INTERMEDIATE;
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(false);
  const [inCart, setInCart] = useState(false);
  const [cartBusy, setCartBusy] = useState(false);

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (wishlistBusy) return;
    setWishlistBusy(true);
    try {
      const res = await fetch(`/api/courses/${course.id}/wishlist`, {
        method: isWishlisted ? "DELETE" : "POST",
      });
      if (res.ok) {
        setIsWishlisted((prev) => !prev);
        toast.success(isWishlisted ? "تمت الإزالة من المفضلة" : "تمت الإضافة للمفضلة");
      } else if (res.status === 401) {
        toast.error("سجّل الدخول أولاً");
      } else {
        toast.error("حدث خطأ، حاول مرة أخرى");
      }
    } catch {
      toast.error("حدث خطأ، حاول مرة أخرى");
    } finally {
      setWishlistBusy(false);
    }
  };

  const addToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (cartBusy || inCart) return;
    setCartBusy(true);
    try {
      const res = await fetch(`/api/cart/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId: course.id }),
      });
      if (res.ok) {
        setInCart(true);
        toast.success("تمت الإضافة للسلة");
      } else if (res.status === 401) {
        toast.error("سجّل الدخول أولاً");
      } else {
        toast.error("حدث خطأ، حاول مرة أخرى");
      }
    } catch {
      toast.error("حدث خطأ، حاول مرة أخرى");
    } finally {
      setCartBusy(false);
    }
  };

  return (
    <m.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.04 }}
      className="group overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_25px_80px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-slate-950/70 dark:shadow-none"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        {course.thumbnailUrl ? (
          <Image
            src={course.thumbnailUrl}
            alt={course.title || "صورة الدورة"}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top_right,_rgba(249,115,22,0.16),transparent_42%),linear-gradient(135deg,#f8fafc,#e2e8f0)] dark:bg-[radial-gradient(circle_at_top_right,_rgba(249,115,22,0.24),transparent_42%),linear-gradient(135deg,#0f172a,#020617)]">
            <div className="rounded-3xl border border-white/20 bg-white/60 p-5 text-orange-500 backdrop-blur dark:bg-white/5">
              <GraduationCap className="h-10 w-10" />
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent" />

        <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <Badge className="border-0 bg-white/85 px-3 py-1 text-slate-800 backdrop-blur">
              {course.categoryName}
            </Badge>
            {course.isFeatured ? (
              <Badge className="border-0 bg-orange-500 px-3 py-1 text-white">
                مميزة
              </Badge>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Badge className={cn("border px-3 py-1", levelInfo.className)}>
              {levelInfo.label}
            </Badge>
            <button
              type="button"
              onClick={toggleWishlist}
              disabled={wishlistBusy}
              aria-label={isWishlisted ? "إزالة من المفضلة" : "أضف للمفضلة"}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/85 backdrop-blur transition-transform hover:scale-110 disabled:opacity-60"
            >
              <Heart
                className={cn(
                  "h-4 w-4 transition-colors",
                  isWishlisted ? "fill-rose-500 text-rose-500" : "text-slate-600"
                )}
              />
            </button>
          </div>
        </div>

        <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3 text-white">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1 rounded-full bg-black/40 px-3 py-1 text-xs font-bold backdrop-blur">
              <Star className="h-3.5 w-3.5 fill-current text-amber-300" />
              {(course.rating || 0).toFixed(1)}
            </div>
            <h3 className="line-clamp-2 text-xl font-black leading-tight">
              {course.title}
            </h3>
          </div>

          <div className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur transition-transform group-hover:scale-110 md:flex">
            <PlayCircle className="h-6 w-6" />
          </div>
        </div>
      </div>

      <div className="space-y-5 p-6">
        <p className="line-clamp-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
          {course.description}
        </p>

        <div className="grid grid-cols-2 gap-3 text-sm text-slate-500 dark:text-slate-400">
          <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-white/5">
            <div className="mb-1 flex items-center gap-2">
              <Users className="h-4 w-4 text-sky-500" />
              <span>الطلاب</span>
            </div>
            <div className="font-black text-slate-900 dark:text-white">
              {course.enrolledCount?.toLocaleString("ar-EG") || "٠"}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-white/5">
            <div className="mb-1 flex items-center gap-2">
              <Layers3 className="h-4 w-4 text-orange-500" />
              <span>الدروس</span>
            </div>
            <div className="font-black text-slate-900 dark:text-white">
              {course.lessonsCount?.toLocaleString("ar-EG") || "٠"}
            </div>
          </div>
        </div>

        {course.enrolled && typeof course.progress === "number" ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
              <span>تقدّمك في الدورة</span>
              <span className="text-orange-500">{course.progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-l from-orange-500 to-amber-400"
                style={{ width: `${Math.max(0, Math.min(course.progress, 100))}%` }}
              />
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {(course.tags || []).slice(0, 3).map((tag) => (
            <span
              key={`${course.id}-${tag}`}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-white/5 dark:text-slate-300"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200/80 pt-5 dark:border-white/10">
          <div>
            <p className="text-xs font-bold text-slate-400">السعر</p>
            <p className="text-2xl font-black text-slate-950 dark:text-white">
              {formatPrice(course.price)}
            </p>
          </div>

          <div className="text-left">
            <p className="mb-2 text-xs font-bold text-slate-400">المدة</p>
            <p className="font-bold text-slate-700 dark:text-slate-200">
              {formatHours(course.duration)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            asChild
            className="h-12 flex-1 rounded-2xl bg-slate-950 text-white hover:bg-slate-800 dark:bg-orange-500 dark:hover:bg-orange-600"
          >
            <Link href={`/courses/${course.id}`} className="flex items-center justify-center gap-2">
              {course.enrolled ? "متابعة التعلم" : "عرض تفاصيل الدورة"}
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          {!course.enrolled && (
            <Button
              type="button"
              variant="outline"
              onClick={addToCart}
              disabled={cartBusy || inCart}
              className="h-12 w-12 shrink-0 rounded-2xl p-0"
              aria-label="أضف للسلة"
            >
              <ShoppingCart className={cn("h-5 w-5", inCart && "text-emerald-500")} />
            </Button>
          )}
        </div>
      </div>
    </m.article>
  );
}
