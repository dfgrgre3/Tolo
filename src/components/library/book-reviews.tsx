"use client";

import * as React from 'react';
import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Star, StarHalf, Pencil, Trash2, ThumbsUp } from 'lucide-react';
import { toast } from 'sonner';

interface Review {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    user: {
        id: string;
        name: string;
        username: string;
        avatar: string | null;
    };
}

interface BookReviewsProps {
    bookId: string;
    initialReviews?: Review[];
    initialAverageRating?: number;
    initialTotalReviews?: number;
    onReviewSubmitted?: () => void;
}

export function BookReviews({
    bookId,
    initialReviews = [],
    initialAverageRating = 0,
    initialTotalReviews = 0,
    onReviewSubmitted
}: BookReviewsProps) {
    const { fetchWithAuth, user } = useAuth();
    const [reviews, setReviews] = useState<Review[]>(initialReviews);
    const [averageRating, setAverageRating] = useState(initialAverageRating);
    const [totalReviews, setTotalReviews] = useState(initialTotalReviews);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [userRating, setUserRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const fetchReviews = async (pageNum: number = 1) => {
        try {
            setLoading(true);
            const response = await fetchWithAuth(`/api/library/books/${bookId}/reviews?page=${pageNum}&limit=10`);
            if (!response.ok) throw new Error('Failed to fetch reviews');
            const data = await response.json();

            if (pageNum === 1) {
                setReviews(data.reviews || []);
            } else {
                setReviews(prev => [...prev, ...(data.reviews || [])]);
            }

            setAverageRating(data.stats?.averageRating || 0);
            setTotalReviews(data.stats?.totalReviews || 0);
            setHasMore(data.pagination?.totalPages > pageNum);
            setPage(pageNum);
        } catch (error) {
            toast.error('فشل في جلب المراجعات');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitReview = async () => {
        if (userRating === 0) {
            toast.error('يرجى تحديد التقييم');
            return;
        }

        try {
            setSubmitting(true);
            const response = await fetchWithAuth(`/api/library/books/${bookId}/reviews`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookId,
                    rating: userRating,
                    comment
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to submit review');
            }

            toast.success('تم إضافة المراجعة بنجاح');
            setShowForm(false);
            setUserRating(0);
            setComment('');
            fetchReviews(1);
            onReviewSubmitted?.();
        } catch (error: any) {
            toast.error(error.message || 'فشل في إرسال المراجعة');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteReview = async (reviewId: string) => {
        if (!confirm('هل أنت متأكد من حذف هذه المراجعة؟')) return;

        try {
            const response = await fetchWithAuth(`/api/library/books/${bookId}/reviews?reviewId=${reviewId}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to delete review');

            toast.success('تم حذف المراجعة');
            fetchReviews(1);
        } catch (error) {
            toast.error('فشل في حذف المراجعة');
        }
    };

    const renderStars = (rating: number, interactive: boolean = false, onRate?: (rating: number) => void) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            const isFilled = i <= (interactive ? (hoverRating || userRating) : rating);
            stars.push(
                <button
                    key={i}
                    type="button"
                    disabled={!interactive}
                    onClick={() => interactive && onRate?.(i)}
                    onMouseEnter={() => interactive && setHoverRating(i)}
                    onMouseLeave={() => interactive && setHoverRating(0)}
                    className={`${interactive ? 'cursor-pointer hover:scale-110' : ''} transition-transform`}
                >
                    <Star
                        className={`w-6 h-6 ${isFilled ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                    />
                </button>
            );
        }
        return stars;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="space-y-6">
            {/* Rating Summary */}
            <div className="bg-card rounded-2xl p-6 border border-border">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-center sm:text-right">
                        <h3 className="text-2xl font-black mb-2">التقييمات والمراجعات</h3>
                        <div className="flex items-center gap-2 justify-center sm:justify-start">
                            <div className="flex">{renderStars(averageRating)}</div>
                            <span className="text-2xl font-black">{averageRating.toFixed(1)}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                            بناءً على {totalReviews} مراجعة
                        </p>
                    </div>

                    {user && (
                        <Button
                            onClick={() => setShowForm(!showForm)}
                            variant={showForm ? 'outline' : 'default'}
                            className="font-bold"
                        >
                            <Pencil className="w-4 h-4 ml-2" />
                            {showForm ? 'إلغاء' : 'اكتب مراجعة'}
                        </Button>
                    )}
                </div>

                {/* Review Form */}
                {showForm && (
                    <div className="mt-6 p-4 bg-accent/20 rounded-xl border border-border">
                        <h4 className="font-bold mb-4">اكتب مراجعتك</h4>

                        <div className="mb-4">
                            <label className="text-sm font-bold mb-2 block">التقييم</label>
                            <div className="flex gap-1">
                                {renderStars(0, true, setUserRating)}
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="text-sm font-bold mb-2 block">المراجعة (اختياري)</label>
                            <Textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="اكتب مراجعتك عن الكتاب هنا..."
                                className="min-h-[100px]"
                            />
                        </div>

                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setShowForm(false)}>
                                إلغاء
                            </Button>
                            <Button
                                onClick={handleSubmitReview}
                                disabled={submitting || userRating === 0}
                                className="font-bold"
                            >
                                {submitting ? 'جاري الإرسال...' : 'إرسال المراجعة'}
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Reviews List */}
            <div className="space-y-4">
                {loading && reviews.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                        جاري تحميل المراجعات...
                    </div>
                ) : reviews.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                        لا توجد مراجعات بعد. كن أول من يراجع هذا الكتاب!
                    </div>
                ) : (
                    reviews.map((review) => (
                        <div key={review.id} className="bg-card rounded-xl p-6 border border-border">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-10 h-10">
                                        <AvatarFallback className="font-bold bg-primary/10 text-primary">
                                            {review.user.name?.substring(0, 2) || '??'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h5 className="font-bold">{review.user.name}</h5>
                                        <p className="text-xs text-muted-foreground">
                                            {formatDate(review.createdAt)}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="flex">{renderStars(review.rating)}</div>
                                    {user?.id === review.user.id && (
                                        <button
                                            onClick={() => handleDeleteReview(review.id)}
                                            className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                                            title="حذف المراجعة"
                                        >
                                            <Trash2 className="w-4 h-4 text-destructive" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {review.comment && (
                                <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                                    {review.comment}
                                </p>
                            )}
                        </div>
                    ))
                )}

                {/* Load More */}
                {hasMore && (
                    <div className="text-center pt-4">
                        <Button
                            variant="outline"
                            onClick={() => fetchReviews(page + 1)}
                            disabled={loading}
                            className="font-bold"
                        >
                            {loading ? 'جاري التحميل...' : 'عرض المزيد'}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

// Helper function to render star rating display
export function StarRating({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
    const sizeClass = {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-6 h-6'
    }[size];

    return (
        <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <Star
                    key={star}
                    className={`${sizeClass} ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                />
            ))}
            <span className="mr-2 font-bold text-sm">{rating.toFixed(1)}</span>
        </div>
    );
}