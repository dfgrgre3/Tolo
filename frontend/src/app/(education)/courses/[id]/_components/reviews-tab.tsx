"use client";

import { useEffect } from "react";
import { m } from "framer-motion";
import { Star, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Review, ReviewStats } from "./types";

export function ReviewsTab({
  courseId,
  courseRating,
  enrolled,
  reviews,
  setReviews,
  reviewStats,
  setReviewStats,
  reviewsLoading,
  setReviewsLoading,
  userRating,
  setUserRating,
  userComment,
  setUserComment,
  submittingReview,
  setSubmittingReview

}: {courseId: string;courseRating: number;enrolled: boolean;reviews: Review[];setReviews: (r: Review[]) => void;reviewStats: ReviewStats | null;setReviewStats: (s: ReviewStats | null) => void;reviewsLoading: boolean;setReviewsLoading: (l: boolean) => void;userRating: number;setUserRating: (r: number) => void;userComment: string;setUserComment: (c: string) => void;submittingReview: boolean;setSubmittingReview: (s: boolean) => void;}) {
  useEffect(() => {
    const fetchReviews = async () => {
      setReviewsLoading(true);
      try {
        const res = await fetch(`/api/courses/${courseId}/reviews`);
        if (res.ok) {
          const data = await res.json();
          const reviewData = data.data || data;
          setReviews(reviewData.reviews || []);
          setReviewStats(reviewData.stats || null);
        }
      } catch {

        // silently handled
      } finally {setReviewsLoading(false);
      }
    };
    fetchReviews();
  }, [courseId, setReviews, setReviewStats, setReviewsLoading]);

  const handleSubmitReview = async () => {
    if (userRating === 0) {
      toast.error("يرجى اختيار تقييم");
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: userRating, comment: userComment || undefined })
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`تم إرسال تقييمك! +${data.data?.xpAwarded || 10} XP`);
        setUserRating(0);
        setUserComment("");
        // Refresh reviews
        const refreshRes = await fetch(`/api/courses/${courseId}/reviews`);
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          const reviewData = refreshData.data || refreshData;
          setReviews(reviewData.reviews || []);
          setReviewStats(reviewData.stats || null);
        }
      } else {
        const err = await res.json();
        toast.error(err.error || "فشل إرسال التقييم");
      }
    } catch {
      toast.error("حدث خطأ أثناء إرسال التقييم");
    } finally {
      setSubmittingReview(false);
    }
  };

  const avgRating = reviewStats?.avgRating || courseRating;
  const totalReviews = reviewStats?.totalReviews || 0;

  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl space-y-6">
      
      {/* Review summary */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-gray-900/80 p-6">
        <div className="flex items-center gap-8">
          <div className="text-center">
            <p className="text-5xl font-black text-gray-900 dark:text-white">{avgRating.toFixed(1)}</p>
            <div className="flex items-center justify-center gap-0.5 mt-2">
              {Array.from({ length: 5 }).map((_, i) =>
              <Star
                key={i}
                className={cn(
                  "h-4 w-4",
                  i < Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-gray-300"
                )} />

              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">{totalReviews} تقييم</p>
          </div>
          <div className="flex-1 space-y-2">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = reviewStats?.distribution?.[stars] || 0;
              const percentage = totalReviews > 0 ? count / totalReviews * 100 : 0;
              return (
                <div key={stars} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-gray-500 w-3">{stars}</span>
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <div className="flex-1 h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all"
                      style={{ width: `${percentage}%` }} />
                    
                  </div>
                  <span className="text-[10px] text-gray-400 w-6 text-left">{count}</span>
                </div>);

            })}
          </div>
        </div>
      </div>

      {/* Submit Review Form */}
      {enrolled &&
      <div className="rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-gray-900/80 p-6 space-y-4">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">شارك تقييمك</h3>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) =>
          <button
            key={i}
            onClick={() => setUserRating(i + 1)}
            className="p-1 transition-transform hover:scale-110">
            
                <Star
              className={cn(
                "h-7 w-7 transition-colors",
                i < userRating ? "fill-amber-400 text-amber-400" : "text-gray-300 hover:text-amber-300"
              )} />
            
              </button>
          )}
            {userRating > 0 &&
          <span className="text-sm font-bold text-amber-500 mr-2">{userRating}/5</span>
          }
          </div>
          <textarea
          value={userComment}
          onChange={(e) => setUserComment(e.target.value)}
          placeholder="اكتب تعليقك (اختياري)..."
          className="w-full h-24 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl p-4 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
        
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">ستحصل على 10 نقطة XP عند إرسال تقييمك</p>
            <Button
            onClick={handleSubmitReview}
            disabled={submittingReview || userRating === 0}
            className="gap-2 bg-primary text-white rounded-xl h-10 px-6 font-bold text-sm shadow-lg shadow-primary/20">
            
              {submittingReview && <Loader2 className="h-4 w-4 animate-spin" />}
              إرسال التقييم
            </Button>
          </div>
        </div>
      }

      {/* Reviews List */}
      {reviewsLoading ?
      <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-gray-500">جاري تحميل التقييمات...</p>
        </div> :
      reviews.length > 0 ?
      <div className="space-y-3">
          {reviews.map((review) =>
        <div
          key={review.id}
          className="rounded-xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-gray-900/60 p-5 space-y-3">
          
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-sm font-bold">
                    {review.user?.name?.charAt(0) || "U"}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900 dark:text-white">{review.user?.name || "مستخدم"}</p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(review.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) =>
              <Star
                key={i}
                className={cn(
                  "h-3.5 w-3.5",
                  i < review.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"
                )} />

              )}
                </div>
              </div>
              {review.comment &&
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{review.comment}</p>
          }
            </div>
        )}
        </div> :

      <div className="text-center py-12 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10">
          <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">لا توجد تقييمات بعد</p>
          <p className="text-xs text-gray-400 mt-1">
            {enrolled ? "كن أول من يشارك رأيه!" : "سجل في الدورة لتتمكن من التقييم"}
          </p>
        </div>
      }
    </m.div>);
}
