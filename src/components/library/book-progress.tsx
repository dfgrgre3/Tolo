"use client";

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen, CheckCircle2, Play, Pause } from 'lucide-react';
import { toast } from 'sonner';

interface BookProgressData {
    id?: string;
    bookId: string;
    bookTitle: string;
    progress: number;
    currentPage: number;
    totalPages: number | null;
    isCompleted: boolean;
    lastReadAt: string | null;
    startedReading: string | null;
}

interface BookProgressProps {
    bookId: string;
    totalPages?: number;
    onProgressUpdate?: (progress: BookProgressData) => void;
}

export function BookProgress({ bookId, totalPages, onProgressUpdate }: BookProgressProps) {
    const { fetchWithAuth, user } = useAuth();
    const [progressData, setProgressData] = useState<BookProgressData | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [isReading, setIsReading] = useState(false);

    // Fetch progress on mount
    const fetchProgress = async () => {
        try {
            setLoading(true);
            const response = await fetchWithAuth(`/api/library/books/${bookId}/progress`);
            if (!response.ok) throw new Error('Failed to fetch progress');
            const data = await response.json();

            if (data.progress) {
                setProgressData(data.progress);
                setCurrentPage(data.progress.currentPage || 1);
                setIsReading(data.progress.progress > 0 && !data.progress.isCompleted);
            }
        } catch (error) {
            toast.error('فشل في جلب تقدم القراءة');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchProgress();
        }
    }, [user, bookId]);

    const handleStartReading = async () => {
        try {
            setUpdating(true);
            const response = await fetchWithAuth(`/api/library/books/${bookId}/progress`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookId,
                    totalPages
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to start reading');
            }

            toast.success('تم بدء القراءة');
            fetchProgress();
        } catch (error: any) {
            toast.error(error.message || 'فشل في بدء القراءة');
        } finally {
            setUpdating(false);
        }
    };

    const handleUpdateProgress = async (page: number) => {
        if (!progressData?.id) return;

        try {
            setUpdating(true);
            const newProgress = Math.min(100, Math.round((page / (totalPages || page)) * 100));
            const isCompleted = page >= (totalPages || page);

            const response = await fetchWithAuth(`/api/library/books/${bookId}/progress`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookId,
                    currentPage: page,
                    progress: newProgress,
                    isCompleted
                })
            });

            if (!response.ok) throw new Error('Failed to update progress');

            const updatedData = await response.json();
            setProgressData(updatedData);
            setCurrentPage(page);
            setIsReading(!isCompleted);

            if (isCompleted) {
                toast.success('تم إنهاء الكتاب! 🎉');
            }

            onProgressUpdate?.(updatedData);
        } catch (error) {
            toast.error('فشل في تحديث التقدم');
        } finally {
            setUpdating(false);
        }
    };

    const handleNextPage = () => {
        const nextPage = currentPage + 1;
        if (totalPages && nextPage > totalPages) {
            toast('وصلت إلى آخر صفحة');
            return;
        }
        setCurrentPage(nextPage);
        handleUpdateProgress(nextPage);
    };

    const handlePrevPage = () => {
        if (currentPage <= 1) return;
        const prevPage = currentPage - 1;
        setCurrentPage(prevPage);
        handleUpdateProgress(prevPage);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (!user) {
        return (
            <div className="text-center p-4 text-muted-foreground">
                يرجى تسجيل الدخول لتتبع تقدم القراءة
            </div>
        );
    }

    if (loading) {
        return (
            <div className="text-center p-4">
                <div className="animate-pulse">جاري التحميل...</div>
            </div>
        );
    }

    // Not started reading yet
    if (!progressData) {
        return (
            <div className="bg-card rounded-xl p-6 border border-border">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <BookOpen className="w-6 h-6 text-primary" />
                        <div>
                            <h4 className="font-bold">لم تبدأ القراءة بعد</h4>
                            <p className="text-sm text-muted-foreground">ابدأ القراءة لتتبع تقدمك</p>
                        </div>
                    </div>
                    <Button onClick={handleStartReading} disabled={updating}>
                        {updating ? 'جاري...' : 'بدء القراءة'}
                    </Button>
                </div>
            </div>
        );
    }

    // Completed
    if (progressData.isCompleted) {
        return (
            <div className="bg-card rounded-xl p-6 border border-green-500/30 bg-green-500/5">
                <div className="flex items-center gap-3 mb-4">
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                    <div className="flex-1">
                        <h4 className="font-bold text-green-700">تم إنهاء الكتاب</h4>
                        <p className="text-sm text-muted-foreground">
                            أخر قراءة: {progressData.lastReadAt ? formatDate(progressData.lastReadAt) : 'غير معروف'}
                        </p>
                    </div>
                </div>
                <Progress value={100} className="h-2" />
                <p className="text-center text-sm text-green-600 mt-2 font-bold">100% مكتمل</p>
            </div>
        );
    }

    // Currently reading
    return (
        <div className="bg-card rounded-xl p-6 border border-border">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <BookOpen className={`w-6 h-6 ${isReading ? 'text-blue-500 animate-pulse' : 'text-primary'}`} />
                    <div>
                        <h4 className="font-bold">تقدم القراءة</h4>
                        <p className="text-sm text-muted-foreground">
                            الصفحة {progressData.currentPage} من {progressData.totalPages || '؟؟'}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrevPage}
                        disabled={currentPage <= 1 || updating}
                    >
                        السابق
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleNextPage}
                        disabled={updating || (totalPages ? currentPage >= totalPages : false)}
                    >
                        {updating ? 'جاري...' : 'التالي'}
                    </Button>
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">التقدم</span>
                    <span className="font-bold">{Math.round(progressData.progress)}%</span>
                </div>
                <Progress value={progressData.progress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                    أخر قراءة: {progressData.lastReadAt ? formatDate(progressData.lastReadAt) : 'غير معروف'}
                </p>
            </div>
        </div>
    );
}

// Component for "Continue Reading" section on dashboard
export function ContinueReadingSection() {
    const { fetchWithAuth } = useAuth();
    const [booksInProgress, setBooksInProgress] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInProgress = async () => {
            try {
                setLoading(true);
                const response = await fetchWithAuth('/api/library/books/[id]/progress/all?incomplete=true&limit=5');
                if (!response.ok) throw new Error('Failed to fetch');
                const data = await response.json();
                setBooksInProgress(data.progressRecords || []);
            } catch (error) {
                console.error('Error fetching in-progress books:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchInProgress();
    }, [fetchWithAuth]);

    if (loading) {
        return (
            <div className="text-center p-4">
                <div className="animate-pulse">جاري التحميل...</div>
            </div>
        );
    }

    if (booksInProgress.length === 0) {
        return null; // Don't show section if no books in progress
    }

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-black flex items-center gap-2">
                <Play className="w-5 h-5 text-blue-500" />
                متابعة القراءة
            </h3>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {booksInProgress.map((item) => (
                    <div key={item.id} className="bg-card rounded-xl p-4 border border-border hover:border-primary/50 transition-colors">
                        <div className="flex items-start gap-3">
                            <img
                                src={item.book?.coverUrl || '/file.svg'}
                                alt={item.book?.title || 'كتاب'}
                                className="w-16 h-20 object-cover rounded-lg"
                            />
                            <div className="flex-1">
                                <h4 className="font-bold text-sm mb-1">{item.book?.title || 'كتاب'}</h4>
                                <p className="text-xs text-muted-foreground mb-2">بقلم: {item.book?.author || 'مجهول'}</p>

                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                        <span>التقدم</span>
                                        <span className="font-bold">{Math.round(item.progress)}%</span>
                                    </div>
                                    <Progress value={item.progress} className="h-1.5" />
                                    <p className="text-xs text-muted-foreground">
                                        الصفحة {item.currentPage} من {item.totalPages || '؟؟'}
                                    </p>
                                </div>

                                <a
                                    href={`/library/books/${item.bookId}`}
                                    className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                >
                                    <Play className="w-3 h-3" />
                                    متابعة القراءة
                                </a>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}