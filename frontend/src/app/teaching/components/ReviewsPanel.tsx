"use client";

import React, { useState } from "react";
import { Star, MessageCircle, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Review, ReviewReply } from "../hooks/use-teaching-data";

interface ReviewsPanelProps {
  reviews: Review[];
  onReplyToReview: (id: string, text: string) => void;
}

export default function ReviewsPanel({ reviews, onReplyToReview }: ReviewsPanelProps) {
  const [filterRating, setFilterRating] = useState<number | "all">("all");
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [expandedReplyId, setExpandedReplyId] = useState<string | null>(null);

  const filteredReviews = reviews.filter((r) =>
    filterRating === "all" ? true : r.rating === filterRating
  );

  const handleSendReply = (reviewId: string) => {
    const text = replyInputs[reviewId];
    if (!text || !text.trim()) return;
    onReplyToReview(reviewId, text);
    setReplyInputs((prev) => ({ ...prev, [reviewId]: "" }));
    setExpandedReplyId(null);
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">تقييمات وآراء الطلاب</h3>
        <p className="text-[10px] text-slate-400 dark:text-slate-450 mt-0.5">شاهد تقييمات كورساتك وقم بالرد على استفسارات أو ملاحظات الطلاب</p>
      </div>

      {/* Filter stars */}
      <div className="flex flex-wrap gap-2 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-card">
        <button
          onClick={() => setFilterRating("all")}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all border ${
            filterRating === "all"
              ? "bg-primary text-white border-primary"
              : "bg-card text-slate-500 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
          }`}
        >
          الكل
        </button>
        {[5, 4, 3, 2, 1].map((stars) => (
          <button
            key={stars}
            onClick={() => setFilterRating(stars)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
              filterRating === stars
                ? "bg-primary text-white border-primary"
                : "bg-card text-slate-500 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
            }`}
          >
            <span>{stars}</span>
            <Star className={`w-3.5 h-3.5 ${filterRating === stars ? "fill-white" : "fill-amber-500 text-amber-500"}`} />
          </button>
        ))}
      </div>

      {/* Reviews list */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <div className="text-center p-8 bg-slate-50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs">
            لا توجد تقييمات مطابقة للتصفية الحالية.
          </div>
        ) : (
          filteredReviews.map((review) => (
            <Card key={review.id} className="border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-card">
              <CardContent className="p-6 space-y-4 text-xs font-semibold">
                {/* Review Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 rounded-full">
                      <AvatarImage src={review.studentAvatar} alt={review.studentName} />
                      <AvatarFallback>{review.studentName.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100">{review.studentName}</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-450">على كورس: {review.courseTitle}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star
                          key={idx}
                          className={`w-3.5 h-3.5 ${
                            idx < review.rating ? "fill-amber-550 text-amber-500" : "text-slate-200 dark:text-slate-800"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-400">{review.date}</span>
                  </div>
                </div>

                {/* Comment */}
                <p className="text-slate-600 dark:text-slate-350 leading-relaxed font-medium">
                  {review.comment}
                </p>

                {/* Replies Thread */}
                {review.replies.length > 0 && (
                  <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl space-y-3 border border-slate-100 dark:border-slate-850">
                    {review.replies.map((rep: ReviewReply) => (
                      <div key={rep.id} className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-primary">
                          <span>ردك: {rep.author}</span>
                          <span className="text-slate-400">{rep.date}</span>
                        </div>
                        <p className="text-slate-650 dark:text-slate-300 leading-normal font-medium">{rep.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply action */}
                <div className="pt-2">
                  {expandedReplyId === review.id ? (
                    <div className="space-y-3">
                      {/* Canned reply templates */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                        <span className="text-[9px] text-slate-400 font-bold whitespace-nowrap">قوالب الرد:</span>
                        {[
                          "شكراً جزيلاً لك على هذا التقييم الرائع! يسعدنا جداً إعجابك بالكورس.",
                          "نشكرك على ملاحظاتك القيمة، وسنعمل على تحسين الدورة باستمرار.",
                          "سعيد جداً بتقدمك الممتاز في الدورة، بالتوفيق دائماً!",
                        ].map((tpl, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() =>
                              setReplyInputs((prev) => ({ ...prev, [review.id]: tpl }))
                            }
                            className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[9px] text-slate-600 dark:text-slate-300 rounded-lg whitespace-nowrap"
                          >
                            {tpl}
                          </button>
                        ))}
                      </div>

                      <Textarea
                        value={replyInputs[review.id] || ""}
                        onChange={(e) =>
                          setReplyInputs((prev) => ({ ...prev, [review.id]: e.target.value }))
                        }
                        placeholder="اكتب ردك على الطالب هنا..."
                        className="rounded-xl border-slate-200 dark:border-slate-800 text-xs text-right"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleSendReply(review.id)}
                          size="sm"
                          className="bg-primary text-white flex items-center gap-1.5 rounded-lg text-xs"
                        >
                          <Send className="w-3.5 h-3.5" />
                          إرسال الرد
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedReplyId(null)}
                          className="rounded-lg text-slate-450 text-xs"
                        >
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedReplyId(review.id)}
                      className="text-primary hover:bg-primary/5 flex items-center gap-1.5 rounded-lg text-xs"
                    >
                      <MessageCircle className="w-4 h-4" />
                      رد على التقييم
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
