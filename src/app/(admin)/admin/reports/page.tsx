"use client";

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  BookOpen,
  TrendingUp,
  DollarSign,
  Star,
  Eye,
  Download,
  BarChart3,
  LineChart,
  RefreshCw,
  Calendar,
  Target,
  Award,
  Zap,
  LayoutDashboard,
  ShieldCheck,
  PieChart
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminCard, AdminStatsCard, AdminGridCard } from '@/components/admin/ui/admin-card';
import { AdminButton } from '@/components/admin/ui/admin-button';
import { DashboardSkeleton } from '@/components/admin/ui/loading-skeleton';
import { exportToCSV, ExportColumn } from '@/lib/export-utils';
import { apiRoutes } from '@/lib/api/routes';

interface OverviewData {
  users?: {
    total: number;
    newToday: number;
    newThisWeek: number;
    newThisMonth: number;
  };
  books?: {
    total: number;
    newThisMonth: number;
    totalDownloads: number;
    downloadsThisMonth: number;
  };
  subjects?: {
    total: number;
    active: number;
  };
  engagement?: {
    totalReviews: number;
    reviewsThisMonth: number;
    activeSessions: number;
  };
  popularBooks?: Array<{
    id: string;
    title: string;
    author: string;
    downloads: number;
    reviewCount: number;
  }>;
  popularSubjects?: Array<{
    id: string;
    title: string;
    enrolledCount: number;
    isPublished: boolean;
  }>;
  trends?: {
    userRegistrations: Array<{ date: string; count: number }>;
  };
}

interface BookReport {
  books: Array<{
    id: string;
    title: string;
    author: string;
    subject: string;
    downloads: number;
    rating: number;
    views: number;
    reviewCount: number;
    createdAt: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
  stats: {
    totalBooks: number;
    avgRating: number;
    totalDownloads: number;
    totalViews: number;
  };
}

interface UserReport {
  users: Array<{
    id: string;
    name: string;
    email: string;
    username: string;
    role: string;
    status: string;
    createdAt: string;
    lastLogin: string | null;
    monthlyAiMessages: number;
    monthlyExams: number;
    uploadedBooks: number;
    reviews: number;
    sessions: number;
    studySessions: number;
  }>;
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
  stats: {
    totalUsers: number;
    byRole: Array<{ role: string; count: number }>;
  };
}

const STYLES = {
  glass: "admin-glass p-8 md:p-12",
  card: "admin-card h-full p-6 transition-all",
  neonText: "font-black tracking-tight",
  goldText: "text-primary font-black"
};

export default function AdminReportsPage() {
  const { fetchWithAuth } = useAuth();
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [booksReport, setBooksReport] = useState<BookReport | null>(null);
  const [usersReport, setUsersReport] = useState<UserReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchOverview = async () => {
    try {
      const response = await fetchWithAuth(apiRoutes.admin.reportsOverview);
      if (!response.ok) throw new Error('Failed to fetch overview');
      const data = await response.json();
      setOverview(data.data || data);
    } catch (error) {
      toast.error('فشل في جلب نظرة عامة');
    }
  };

  const fetchBooksReport = async (page = 1) => {
    try {
      const response = await fetchWithAuth(`${apiRoutes.admin.reportsBooks}?page=${page}`);
      if (!response.ok) throw new Error('Failed to fetch books report');
      const data = await response.json();
      setBooksReport(data.data || data);
    } catch (error) {
      toast.error('فشل في جلب تقرير الكتب');
    }
  };

  const fetchUsersReport = async (page = 1) => {
    try {
      const response = await fetchWithAuth(`${apiRoutes.admin.reportsUsers}?page=${page}`);
      if (!response.ok) throw new Error('Failed to fetch users report');
      const data = await response.json();
      setUsersReport(data.data || data);
    } catch (error) {
      toast.error('فشل في جلب تقرير المستخدمين');
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchOverview(),
      fetchBooksReport(),
      fetchUsersReport()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleRefresh = () => {
    fetchAllData();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'لم يسجل دخول';
    try {
      return new Date(dateString).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const exportBooksCSV = () => {
    if (!booksReport?.books || booksReport.books.length === 0) {
      toast.error('لا توجد بيانات للتصدير');
      return;
    }
    const exportColumns: ExportColumn<BookReport['books'][0]>[] = [
      { header: 'العنوان', accessor: 'title' },
      { header: 'المؤلف', accessor: 'author' },
      { header: 'المادة', accessor: 'subject' },
      { header: 'التحميلات', accessor: (b) => b.downloads },
      { header: 'التقييم', accessor: (b) => b.rating },
      { header: 'المشاهدات', accessor: (b) => b.views },
      { header: 'التعليقات', accessor: (b) => b.reviewCount },
      { header: 'تاريخ الإنشاء', accessor: (b) => new Date(b.createdAt).toLocaleDateString('ar-EG') },
    ];
    exportToCSV(booksReport.books, exportColumns, 'books-report');
    toast.success('تم التصدير بنجاح');
  };

  const exportUsersCSV = () => {
    if (!usersReport?.users || usersReport.users.length === 0) {
      toast.error('لا توجد بيانات للتصدير');
      return;
    }
    const exportColumns: ExportColumn<UserReport['users'][0]>[] = [
      { header: 'الاسم', accessor: (u) => u.name || u.username },
      { header: 'البريد الإلكتروني', accessor: 'email' },
      { header: 'اسم المستخدم', accessor: 'username' },
      { header: 'الدور', accessor: 'role' },
      { header: 'الحالة', accessor: 'status' },
      { header: 'تاريخ الإنشاء', accessor: (u) => new Date(u.createdAt).toLocaleDateString('ar-EG') },
      { header: 'آخر دخول', accessor: (u) => u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('ar-EG') : 'لم يسجل دخول' },
      { header: 'رسائل AI الشهرية', accessor: (u) => u.monthlyAiMessages },
      { header: 'الاختبارات الشهرية', accessor: (u) => u.monthlyExams },
      { header: 'الكتب المرفوعة', accessor: (u) => u.uploadedBooks },
      { header: 'المراجعات', accessor: (u) => u.reviews },
      { header: 'الجلسات', accessor: (u) => u.sessions },
      { header: 'جلسات الدراسة', accessor: (u) => u.studySessions },
    ];
    exportToCSV(usersReport.users, exportColumns, 'users-report');
    toast.success('تم التصدير بنجاح');
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-12 pb-20" dir="rtl">
      {/* Cinematic Header */}
      <div className={`${STYLES.glass} flex flex-col lg:flex-row items-center justify-between gap-10 group relative overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />

        <div className="space-y-4 text-center lg:text-right flex-1 relative z-10">
          <div className="inline-flex items-center gap-3 rounded-full border border-primary/30 bg-primary/10 px-6 py-2 text-xs font-black uppercase tracking-[0.2em] text-primary shadow-[0_0_20px_rgba(var(--primary),0.2)]">
            <LayoutDashboard className="h-5 w-5" />
            <span>نظام التقارير الإدارية المتكامل</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
            <span className={STYLES.neonText}>التقارير والبيانات</span> 🏛️
          </h1>
          <p className="text-lg text-gray-400 font-medium max-w-2xl font-bold">
            تحليل شامل لأداء المنصة، تتبع التفاعل، ومراقبة نمو قاعدة المستخدمين والطلاب.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 bg-accent/10 p-4 rounded-[2.5rem] border border-white/5 backdrop-blur-3xl relative z-10 shadow-2xl">
          <AdminButton
            variant="outline"
            size="lg"
            onClick={handleRefresh}
            icon={RefreshCw}
            className="h-12 px-6 rounded-2xl border-white/10 text-foreground font-black uppercase text-[10px] tracking-widest hover:bg-accent shadow-lg"
          >
            تحديث البيانات
          </AdminButton>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 bg-card/50 backdrop-blur-xl border border-white/10 p-2 rounded-2xl">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl font-bold px-6 py-2 transition-all">نظرة عامة</TabsTrigger>
          <TabsTrigger value="books" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl font-bold px-6 py-2 transition-all">الكتب والمصادر</TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl font-bold px-6 py-2 transition-all">المستخدمين</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {/* Stats Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <AdminStatsCard
              title="إجمالي المستخدمين"
              value={overview?.users?.total || 0}
              description={`+${overview?.users?.newToday || 0} اليوم`}
              icon={Users}
              color="blue"
            />
            <AdminStatsCard
              title="إجمالي الكتب"
              value={overview?.books?.total || 0}
              description={`${overview?.books?.totalDownloads || 0} تحميل`}
              icon={BookOpen}
              color="green"
            />
            <AdminStatsCard
              title="المواد الدراسية"
              value={overview?.subjects?.total || 0}
              description={`${overview?.subjects?.active || 0} نشط`}
              icon={BarChart3}
              color="purple"
            />
            <AdminStatsCard
              title="التفاعل"
              value={overview?.engagement?.totalReviews || 0}
              description={`${overview?.engagement?.activeSessions || 0} جلسة نشطة`}
              icon={TrendingUp}
              color="yellow"
            />
          </div>

          {/* Popular Books */}
          <AdminGridCard title="الكتب الأكثر تحميلاً" className="mb-8">
            <div className="space-y-4">
              {overview?.popularBooks?.map((book, i) => (
                <div key={book.id} className="flex items-center justify-between p-4 bg-accent/20 rounded-xl hover:bg-accent/30 transition-all border border-white/5">
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary" className="font-black text-lg w-10 h-10 flex items-center justify-center">#{i + 1}</Badge>
                    <div>
                      <p className="font-bold text-lg">{book.title}</p>
                      <p className="text-sm text-muted-foreground">{book.author}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <span className="flex items-center gap-2 bg-blue-500/10 text-blue-500 px-3 py-1 rounded-lg">
                      <Download className="w-4 h-4" />
                      {book.downloads}
                    </span>
                    <span className="flex items-center gap-2 bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded-lg">
                      <Star className="w-4 h-4" />
                      {book.reviewCount}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </AdminGridCard>

          {/* Popular Subjects */}
          <AdminGridCard title="المواد الأكثر تسجيلاً" className="mb-8">
            <div className="space-y-4">
              {overview?.popularSubjects?.map((subject, i) => (
                <div key={subject.id} className="flex items-center justify-between p-4 bg-accent/20 rounded-xl hover:bg-accent/30 transition-all border border-white/5">
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary" className="font-black text-lg w-10 h-10 flex items-center justify-center">#{i + 1}</Badge>
                    <div>
                      <p className="font-bold text-lg">{subject.title}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <Badge variant={subject.isPublished ? "default" : "secondary"} className="font-bold">
                      {subject.isPublished ? 'منشور' : 'مسودة'}
                    </Badge>
                    <span className="flex items-center gap-2 bg-purple-500/10 text-purple-500 px-3 py-1 rounded-lg">
                      <Users className="w-4 h-4" />
                      {subject.enrolledCount} طالب
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </AdminGridCard>

          {/* User Registration Trend */}
          <AdminGridCard title="اتجاه تسجيل المستخدمين (آخر 7 أيام)" subtitle="تحليل نمو قاعدة المستخدمين النشطين">
            <div className="h-[200px] flex items-end gap-3">
              {overview?.trends?.userRegistrations?.map((item) => {
                const maxCount = Math.max(...(overview?.trends?.userRegistrations?.map(d => d.count) || [1]));
                return (
                  <div key={item.date} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-full bg-gradient-to-t from-primary to-primary/50 rounded-t-lg hover:from-primary/80 transition-all shadow-[0_0_15px_rgba(var(--primary),0.2)]"
                      style={{ height: `${(item.count / maxCount) * 180}px` }}
                    />
                    <span className="text-xs text-muted-foreground font-bold">
                      {formatDate(item.date)}
                    </span>
                  </div>
                );
              })}
            </div>
          </AdminGridCard>
        </TabsContent>

        <TabsContent value="books">
          <AdminGridCard title="تقرير الكتب والمصادر" extra={
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-black">
                إجمالي: {booksReport?.stats?.totalBooks || 0}
              </Badge>
              <AdminButton variant="outline" size="sm" onClick={exportBooksCSV} icon={Download} className="h-8 px-3 rounded-lg">
                تصدير CSV
              </AdminButton>
            </div>
          }>
            <div className="space-y-4">
              {booksReport?.books?.map((book) => (
                <div key={book.id} className="flex items-center justify-between p-5 border-b border-white/5 hover:bg-accent/10 transition-all rounded-xl">
                  <div>
                    <p className="font-bold text-lg">{book.title}</p>
                    <p className="text-sm text-muted-foreground">{book.author}</p>
                    <p className="text-xs text-muted-foreground mt-1">{book.subject}</p>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <span className="flex items-center gap-2 bg-blue-500/10 text-blue-500 px-3 py-1 rounded-lg">
                      <Eye className="w-4 h-4" />
                      {book.views}
                    </span>
                    <span className="flex items-center gap-2 bg-green-500/10 text-green-500 px-3 py-1 rounded-lg">
                      <Download className="w-4 h-4" />
                      {book.downloads}
                    </span>
                    <span className="flex items-center gap-2 bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded-lg">
                      <Star className="w-4 h-4" />
                      {book.rating.toFixed(1)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(book.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {booksReport?.pagination && (
              <div className="flex justify-center gap-2 mt-6">
                {Array.from({ length: booksReport.pagination.totalPages }, (_, i) => (
                  <AdminButton
                    key={i}
                    variant={booksReport.pagination.page === i + 1 ? "default" : "outline"}
                    size="sm"
                    onClick={() => fetchBooksReport(i + 1)}
                    className="w-10 h-10 rounded-xl font-black"
                  >
                    {i + 1}
                  </AdminButton>
                ))}
              </div>
            )}
          </AdminGridCard>

          {/* Stats Summary */}
          {booksReport?.stats && (
            <div className="grid gap-6 md:grid-cols-4 mt-8">
              <AdminStatsCard title="إجمالي الكتب" value={booksReport.stats.totalBooks} icon={BookOpen} color="blue" />
              <AdminStatsCard title="متوسط التقييم" value={booksReport.stats.avgRating.toFixed(1)} icon={Star} color="yellow" />
              <AdminStatsCard title="إجمالي التحميلات" value={booksReport.stats.totalDownloads} icon={Download} color="green" />
              <AdminStatsCard title="إجمالي المشاهدات" value={booksReport.stats.totalViews} icon={Eye} color="purple" />
            </div>
          )}
        </TabsContent>

        <TabsContent value="users">
          <AdminGridCard title="تقرير المستخدمين والطلاب" extra={
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-black">
                إجمالي: {usersReport?.stats?.totalUsers || 0}
              </Badge>
              <AdminButton variant="outline" size="sm" onClick={exportUsersCSV} icon={Download} className="h-8 px-3 rounded-lg">
                تصدير CSV
              </AdminButton>
            </div>
          }>
            <div className="space-y-4">
              {usersReport?.users?.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-5 border-b border-white/5 hover:bg-accent/10 transition-all rounded-xl">
                  <div>
                    <p className="font-bold text-lg">{user.name || user.username}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge className="font-bold">{user.role}</Badge>
                      <Badge variant={user.status === 'ACTIVE' ? "default" : "destructive"} className="font-bold">
                        {user.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <span className="bg-blue-500/10 text-blue-500 px-3 py-1 rounded-lg font-bold">{user.monthlyAiMessages} رسالة AI</span>
                    <span className="bg-purple-500/10 text-purple-500 px-3 py-1 rounded-lg font-bold">{user.monthlyExams} اختبار</span>
                    <span className="bg-green-500/10 text-green-500 px-3 py-1 rounded-lg font-bold">{user.uploadedBooks} كتاب</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(user.lastLogin)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {usersReport?.pagination && (
              <div className="flex justify-center gap-2 mt-6">
                {Array.from({ length: usersReport.pagination.totalPages }, (_, i) => (
                  <AdminButton
                    key={i}
                    variant={usersReport.pagination.page === i + 1 ? "default" : "outline"}
                    size="sm"
                    onClick={() => fetchUsersReport(i + 1)}
                    className="w-10 h-10 rounded-xl font-black"
                  >
                    {i + 1}
                  </AdminButton>
                ))}
              </div>
            )}
          </AdminGridCard>

          {/* Stats Summary */}
          {usersReport?.stats && (
            <div className="grid gap-6 md:grid-cols-2 mt-8">
              <AdminStatsCard title="إجمالي المستخدمين" value={usersReport.stats.totalUsers} icon={Users} color="blue" />
              <AdminGridCard title="توزيع الأدوار">
                <div className="space-y-3">
                  {usersReport.stats.byRole?.map((item) => (
                    <div key={item.role} className="flex justify-between items-center p-3 bg-accent/20 rounded-xl border border-white/5">
                      <span className="font-bold">{item.role}</span>
                      <Badge className="font-black text-lg">{item.count}</Badge>
                    </div>
                  ))}
                </div>
              </AdminGridCard>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
