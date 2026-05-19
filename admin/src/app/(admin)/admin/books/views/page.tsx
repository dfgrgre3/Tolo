"use client";

import * as React from 'react';
import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { AdminButton } from '@/components/admin/ui/admin-button';
import { AdminCard, AdminStatsCard } from '@/components/admin/ui/admin-card';
import { AdminDataTable } from '@/components/admin/ui/admin-table';
import { RowActions } from '@/components/admin/ui/admin-table';
import { ConfirmDialog } from '@/components/admin/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Star, BookOpen, Search, RefreshCw, Download } from 'lucide-react';
import { DashboardSkeleton } from '@/components/admin/ui/loading-skeleton';
import { exportToCSV, exportToJSON, ExportColumn } from '@/lib/export-utils';

interface Review {
    id: string;
    bookId: string;
    bookTitle: string;
    bookAuthor: string;
    userId: string;
    userName: string;
    userAvatar: string | null;
    rating: number;
    comment: string | null;
    createdAt: string;
    updatedAt: string;
}

interface ReviewsResponse {
    reviews: Review[];
    pagination: {
        page: number;
        limit: number;
        totalCount: number;
        totalPages: number;
    };
    stats: {
        averageRating: number;
        totalReviews: number;
    };
}

export default function AdminBookReviewsPage() {
    const { fetchWithAuth } = useAuth();
    const queryClient = useQueryClient();

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [search, setSearch] = useState('');
    const [minRating, setMinRating] = useState<string>('');
    const [maxRating, setMaxRating] = useState<string>('');
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; reviewId: string | null }>({
        open: false,
        reviewId: null,
    });

    const fetchReviews = async (): Promise<ReviewsResponse> => {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
        });
        if (search) params.set('search', search);
        if (minRating) params.set('minRating', minRating);
        if (maxRating) params.set('maxRating', maxRating);

        const response = await fetchWithAuth(`/api/admin/books/reviews?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch reviews');
        return response.json();
    };

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['admin', 'book-reviews', page, limit, search, minRating, maxRating],
        queryFn: fetchReviews,
    });

    const deleteMutation = useMutation({
        mutationFn: async (reviewId: string) => {
            const response = await fetchWithAuth(`/api/admin/books/reviews?reviewId=${reviewId}`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error('Failed to delete review');
            return response.json();
        },
        onSuccess: () => {
            toast.success('تم حذف المراجعة بنجاح');
            queryClient.invalidateQueries({ queryKey: ['admin', 'book-reviews'] });
            setDeleteDialog({ open: false, reviewId: null });
        },
        onError: () => {
            toast.error('فشل في حذف المراجعة');
        },
    });

    const handleDelete = (review: Review) => {
        setDeleteDialog({ open: true, reviewId: review.id });
    };

    const confirmDelete = () => {
        if (deleteDialog.reviewId) {
            deleteMutation.mutate(deleteDialog.reviewId);
        }
    };

    const handleExportCSV = () => {
        if (!reviews || reviews.length === 0) {
            toast.error('لا توجد بيانات للتصدير');
            return;
        }
        const exportColumns: ExportColumn<Review>[] = [
            { header: 'عنوان الكتاب', accessor: 'bookTitle' },
            { header: 'المؤلف', accessor: 'bookAuthor' },
            { header: 'المراجع', accessor: 'userName' },
            { header: 'التقييم', accessor: (r) => r.rating },
            { header: 'التعليق', accessor: (r) => r.comment || '' },
            { header: 'التاريخ', accessor: (r) => new Date(r.createdAt).toLocaleDateString('ar-EG') },
        ];
        exportToCSV(reviews, exportColumns, 'book-reviews');
        toast.success('تم التصدير بنجاح');
    };

    const columns = [
        {
            accessorKey: 'bookTitle',
            header: 'الكتاب',
            cell: ({ row }: any) => {
                const review = row.original;
                return (
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                            <BookOpen className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="font-bold text-sm">{review.bookTitle}</p>
                            <p className="text-xs text-muted-foreground">{review.bookAuthor}</p>
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'userName',
            header: 'المراجع',
            cell: ({ row }: any) => {
                const review = row.original;
                return (
                    <div className="flex items-center gap-3">
                        {review.userAvatar ? (
                            <img src={review.userAvatar} alt={review.userName} className="h-8 w-8 rounded-full" />
                        ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                                {review.userName?.charAt(0)}
                            </div>
                        )}
                        <span className="font-medium">{review.userName}</span>
                    </div>
                );
            },
        },
        {
            accessorKey: 'rating',
            header: 'التقييم',
            cell: ({ row }: any) => {
                const rating = row.original.rating;
                return (
                    <div className="flex items-center gap-1 text-amber-500">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="font-bold">{rating}</span>
                    </div>
                );
            },
        },
        {
            accessorKey: 'comment',
            header: 'التعليق',
            cell: ({ row }: any) => {
                const comment = row.original.comment;
                return (
                    <p className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {comment || '-'}
                    </p>
                );
            },
        },
        {
            accessorKey: 'createdAt',
            header: 'التاريخ',
            cell: ({ row }: any) => {
                const date = new Date(row.original.createdAt);
                return (
                    <span className="text-xs text-muted-foreground">
                        {date.toLocaleDateString('ar-EG')}
                    </span>
                );
            },
        },
        {
            id: 'actions',
            header: 'الإجراءات',
            cell: ({ row }: any) => (
                <RowActions
                    row={row.original}
                    onDelete={handleDelete}
                />
            ),
        },
    ];

    const reviews = data?.reviews || [];
    const pagination = data?.pagination;
    const stats = data?.stats;

    return (
        <div className="space-y-10 pb-20" dir="rtl">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight">إدارة مراجعات الكتب</h1>
                    <p className="text-muted-foreground font-medium mt-1">
                        مراجعة وتقييم الكتب من قبل المستخدمين، وحذف المراجعات غير اللائقة.
                    </p>
                </div>
                <AdminButton
                    variant="outline"
                    onClick={() => refetch()}
                    icon={RefreshCw}
                    className="h-12 px-6 rounded-2xl"
                >
                    تحديث
                </AdminButton>
                <AdminButton
                    variant="outline"
                    onClick={handleExportCSV}
                    icon={Download}
                    className="h-12 px-6 rounded-2xl"
                >
                    تصدير CSV
                </AdminButton>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-6 md:grid-cols-3">
                <AdminStatsCard
                    title="إجمالي المراجعات"
                    value={stats?.totalReviews || 0}
                    icon={Star}
                    color="yellow"
                />
                <AdminStatsCard
                    title="متوسط التقييم"
                    value={stats?.averageRating ? stats.averageRating.toFixed(1) : '0.0'}
                    icon={Star}
                    color="yellow"
                />
                <AdminStatsCard
                    title="الكتب المُراجعة"
                    value={new Set(reviews.map(r => r.bookId)).size}
                    icon={BookOpen}
                    color="blue"
                />
            </div>

            {/* Filters */}
            <AdminCard className="p-6">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1">
                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">
                            بحث
                        </label>
                        <div className="relative">
                            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="ابحث في المراجعات، الكتب، أو المستخدمين..."
                                className="h-12 w-full rounded-xl border-white/10 pr-10"
                            />
                        </div>
                    </div>
                    <div className="w-40">
                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">
                            التقييم الأدنى
                        </label>
                        <Select value={minRating} onValueChange={setMinRating}>
                            <SelectTrigger className="h-12 rounded-xl border-white/10">
                                <SelectValue placeholder="الكل" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">الكل</SelectItem>
                                <SelectItem value="1">1 نجمة فأكثر</SelectItem>
                                <SelectItem value="2">2 نجمة فأكثر</SelectItem>
                                <SelectItem value="3">3 نجوم فأكثر</SelectItem>
                                <SelectItem value="4">4 نجوم فأكثر</SelectItem>
                                <SelectItem value="5">5 نجوم</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="w-40">
                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">
                            التقييم الأقصى
                        </label>
                        <Select value={maxRating} onValueChange={setMaxRating}>
                            <SelectTrigger className="h-12 rounded-xl border-white/10">
                                <SelectValue placeholder="الكل" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">الكل</SelectItem>
                                <SelectItem value="1">1 نجمة</SelectItem>
                                <SelectItem value="2">2 نجوم</SelectItem>
                                <SelectItem value="3">3 نجوم</SelectItem>
                                <SelectItem value="4">4 نجوم</SelectItem>
                                <SelectItem value="5">5 نجوم</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <AdminButton
                        variant="outline"
                        onClick={() => {
                            setSearch('');
                            setMinRating('');
                            setMaxRating('');
                            setPage(1);
                        }}
                        className="h-12 px-6 rounded-xl"
                    >
                        مسح الفلاتر
                    </AdminButton>
                </div>
            </AdminCard>

            {/* Table */}
            {isLoading ? (
                <DashboardSkeleton />
            ) : (
                <AdminDataTable
                    columns={columns}
                    data={reviews}
                    loading={isLoading}
                    serverSide
                    totalRows={pagination?.totalCount || 0}
                    pageCount={pagination?.totalPages || 1}
                    currentPage={page}
                    onPageChange={setPage}
                    onPageSizeChange={setLimit}
                    pageSize={limit}
                    actions={{ onRefresh: () => refetch() }}
                />
            )}

            {/* Delete Confirmation */}
            <ConfirmDialog
                open={deleteDialog.open}
                onOpenChange={(open) => setDeleteDialog({ open, reviewId: null })}
                title="حذف المراجعة"
                description="هل أنت متأكد من حذف هذه المراجعة؟ سيؤدي ذلك إلى تحديث تقييم الكتاب."
                confirmText="نعم، احذف المراجعة"
                variant="destructive"
                onConfirm={confirmDelete}
                loading={deleteMutation.isPending}
            />
        </div>
    );
}