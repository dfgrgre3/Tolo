"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminStatsCard, AdminGridCard } from "@/components/admin/ui/admin-card";
import { AdminBadge } from "@/components/admin/ui/admin-badge";
import { DataTable } from "@/components/admin/ui/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ColumnDef } from "@tanstack/react-table";
import {
  ArrowRight,
  BookOpen,
  FileText,
  Users,
  Clock,
  Edit,
  Eye,
  BarChart3,
  Play,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { formatNumber } from "@/lib/utils";

import { logger } from '@/lib/logger';

interface SubjectDetails {
  id: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  type: string;
  icon: string | null;
  color: string | null;
  gradeLevel: string | null;
  educationType: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    books: number;
    exams: number;
    resources: number;
    enrollments: number;
    studySessions: number;
  };
  books: Array<{
    id: string;
    title: string;
    author: string | null;
    _count: { chapters: number };
  }>;
  exams: Array<{
    id: string;
    title: string;
    duration: number;
    difficulty: string;
    isActive: boolean;
    _count: { results: number };
  }>;
  topStudents: Array<{
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
    totalXP: number;
    level: number;
  }>;
  recentActivity: Array<{
    id: string;
    type: string;
    createdAt: string;
    user: {
      name: string | null;
      email: string;
      avatar: string | null;
    };
  }>;
}

const typeLabels: Record<string, string> = {
  CORE: "أساسي",
  ELECTIVE: "اختياري",
  LANGUAGE: "لغة",
  SCIENCE: "علمي",
  ARTS: "أدبي",
};

const typeColors: Record<string, string> = {
  CORE: "bg-blue-500",
  ELECTIVE: "bg-purple-500",
  LANGUAGE: "bg-green-500",
  SCIENCE: "bg-orange-500",
  ARTS: "bg-pink-500",
};

const difficultyColors: Record<string, string> = {
  EASY: "bg-green-500",
  MEDIUM: "bg-yellow-500",
  HARD: "bg-orange-500",
  EXPERT: "bg-red-500",
};

const difficultyLabels: Record<string, string> = {
  EASY: "سهل",
  MEDIUM: "متوسط",
  HARD: "صعب",
  EXPERT: "خبير",
};

export default function SubjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const subjectId = params.id as string;

  const [subject, setSubject] = React.useState<SubjectDetails | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchSubject = async () => {
      try {
        const response = await fetch(`/api/admin/subjects/${subjectId}`);
        if (response.ok) {
          const data = await response.json();
          setSubject(data.data);
        } else {
          toast.error("المادة غير موجودة");
          router.push("/admin/subjects");
        }
      } catch (error) {
        logger.error("Error fetching subject:", error);
        toast.error("حدث خطأ أثناء جلب بيانات المادة");
      } finally {
        setLoading(false);
      }
    };

    fetchSubject();
  }, [subjectId, router]);

  const bookColumns: ColumnDef<SubjectDetails["books"][0]>[] = [
    {
      accessorKey: "title",
      header: "الكتاب",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
            <BookOpen className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <p className="font-medium">{row.original.title}</p>
            <p className="text-sm text-muted-foreground">{row.original.author || "بدون مؤلف"}</p>
          </div>
        </div>
      ),
    },
    {
      id: "chapters",
      header: "الفصول",
      cell: ({ row }) => (
        <AdminBadge variant="outline">{row.original._count.chapters} فصل</AdminBadge>
      ),
    },
    {
      id: "actions",
      header: "الإجراءات",
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/admin/books/${row.original.id}`}>
            <Eye className="h-4 w-4 ml-1" />
            عرض
          </Link>
        </Button>
      ),
    },
  ];

  const examColumns: ColumnDef<SubjectDetails["exams"][0]>[] = [
    {
      accessorKey: "title",
      header: "الامتحان",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
            <FileText className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <p className="font-medium">{row.original.title}</p>
            <p className="text-sm text-muted-foreground">{row.original.duration} دقيقة</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "difficulty",
      header: "الصعوبة",
      cell: ({ row }) => (
        <Badge className={`${difficultyColors[row.original.difficulty]} text-white`}>
          {difficultyLabels[row.original.difficulty] || row.original.difficulty}
        </Badge>
      ),
    },
    {
      accessorKey: "isActive",
      header: "الحالة",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "default" : "secondary"}>
          {row.original.isActive ? "نشط" : "معطل"}
        </Badge>
      ),
    },
    {
      id: "results",
      header: "النتائج",
      cell: ({ row }) => (
        <span className="text-sm">{row.original._count.results} نتيجة</span>
      ),
    },
    {
      id: "actions",
      header: "الإجراءات",
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/admin/exams/${row.original.id}`}>
            <Eye className="h-4 w-4 ml-1" />
            عرض
          </Link>
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
            <div className="h-4 w-64 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-10 w-32 bg-muted animate-pulse rounded-lg" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-6 space-y-3">
              <div className="h-8 w-8 bg-muted animate-pulse rounded-lg" />
              <div className="h-7 w-20 bg-muted animate-pulse rounded" />
              <div className="h-3 w-16 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!subject) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={subject.nameAr || subject.name}
        description={subject.description || "لا يوجد وصف"}
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push("/admin/subjects")}>
            <ArrowRight className="ml-2 h-4 w-4" />
            العودة للقائمة
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/courses/${subjectId}`}>
              <ExternalLink className="ml-2 h-4 w-4" />
              عرض بالموقع
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/admin/subjects/${subjectId}/curriculum`}>
              <Edit className="ml-2 h-4 w-4" />
              إدارة المنهج
            </Link>
          </Button>
        </div>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <AdminStatsCard
          title="الكتب"
          value={formatNumber(subject._count.books)}
          icon={BookOpen}
          color="blue"
        />
        <AdminStatsCard
          title="الامتحانات"
          value={formatNumber(subject._count.exams)}
          icon={FileText}
          color="purple"
        />
        <AdminStatsCard
          title="المسجلين"
          value={formatNumber(subject._count.enrollments)}
          icon={Users}
          color="green"
        />
        <AdminStatsCard
          title="جلسات الدراسة"
          value={formatNumber(subject._count.studySessions)}
          icon={Clock}
          color="yellow"
        />
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Subject Info */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-xl text-2xl"
                style={{ backgroundColor: subject.color || "#3b82f6" }}
              >
                {subject.icon || "📚"}
              </div>
              <div>
                <CardTitle>{subject.nameAr || subject.name}</CardTitle>
                <CardDescription>{subject.name}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">النوع</span>
              <Badge className={`${typeColors[subject.type] || "bg-gray-500"} text-white`}>
                {typeLabels[subject.type] || subject.type}
              </Badge>
            </div>
            {subject.gradeLevel && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">الصف الدراسي</span>
                <span className="font-medium">{subject.gradeLevel}</span>
              </div>
            )}
            {subject.educationType && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">الشعبة</span>
                <span className="font-medium">{subject.educationType}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">تاريخ الإنشاء</span>
              <span className="text-sm">
                {new Date(subject.createdAt).toLocaleDateString("ar-EG")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">آخر تحديث</span>
              <span className="text-sm">
                {new Date(subject.updatedAt).toLocaleDateString("ar-EG")}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Tabs Content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="curriculum" className="space-y-4">
            <TabsList>
              <TabsTrigger value="curriculum">
                <Play className="ml-2 h-4 w-4" />
                المنهج الدراسي
              </TabsTrigger>
              <TabsTrigger value="books">
                <BookOpen className="ml-2 h-4 w-4" />
                الكتب ({subject._count.books})
              </TabsTrigger>
              <TabsTrigger value="exams">
                <FileText className="ml-2 h-4 w-4" />
                الامتحانات ({subject._count.exams})
              </TabsTrigger>
              <TabsTrigger value="students">
                <Users className="ml-2 h-4 w-4" />
                الطلاب
              </TabsTrigger>
              <TabsTrigger value="activity">
                <BarChart3 className="ml-2 h-4 w-4" />
                النشاط
              </TabsTrigger>
            </TabsList>

            <TabsContent value="curriculum">
              <AdminGridCard title="هيكلية المنهج التعليمي">
                <div className="text-center py-12 space-y-4">
                  <Play className="h-16 w-16 mx-auto mb-4 text-primary opacity-20" />
                  <h3 className="text-xl font-bold">إدارة محتوى الدورة</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    قم بتنظيم الدروس، إضافة الفيديوهات، وترتيب الفصول الدراسية في بيئة سحب وإفلات متطورة.
                  </p>
                  <Button size="lg" className="rounded-xl px-8" asChild>
                    <Link href={`/admin/subjects/${subjectId}/curriculum`}>
                      <Edit className="ml-2 h-4 w-4" />
                      فتح منشئ المنهج
                    </Link>
                  </Button>
                </div>
              </AdminGridCard>
            </TabsContent>

            <TabsContent value="books">
              <AdminGridCard title="الكتب الدراسية">
                {subject.books.length > 0 ? (
                  <DataTable
                    columns={bookColumns}
                    data={subject.books}
                    searchKey="title"
                    searchPlaceholder="البحث عن كتاب..."
                    pageSize={5}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>لا توجد كتب لهذه المادة</p>
                    <Button variant="outline" size="sm" className="mt-3" asChild>
                      <Link href={`/admin/books/new?subject=${subjectId}`}>
                        إضافة كتاب
                      </Link>
                    </Button>
                  </div>
                )}
              </AdminGridCard>
            </TabsContent>

            <TabsContent value="exams">
              <AdminGridCard title="الامتحانات">
                {subject.exams.length > 0 ? (
                  <DataTable
                    columns={examColumns}
                    data={subject.exams}
                    searchKey="title"
                    searchPlaceholder="البحث عن امتحان..."
                    pageSize={5}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>لا توجد امتحانات لهذه المادة</p>
                    <Button variant="outline" size="sm" className="mt-3" asChild>
                      <Link href={`/admin/exams/new?subject=${subjectId}`}>
                        إضافة امتحان
                      </Link>
                    </Button>
                  </div>
                )}
              </AdminGridCard>
            </TabsContent>

            <TabsContent value="students">
              <AdminGridCard title="أفضل الطلاب المسجلين">
                {subject.topStudents.length > 0 ? (
                  <div className="space-y-3">
                    {subject.topStudents.map((student, index) => (
                      <div key={student.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-lg w-6 text-center">
                            {index + 1}
                          </span>
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={student.avatar || undefined} />
                            <AvatarFallback>
                              {student.name?.charAt(0) || student.email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{student.name || "بدون اسم"}</p>
                            <p className="text-sm text-muted-foreground">
                              المستوى {student.level}
                            </p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-primary">
                            {formatNumber(student.totalXP)} XP
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>لا يوجد طلاب مسجلين في هذه المادة</p>
                  </div>
                )}
              </AdminGridCard>
            </TabsContent>

            <TabsContent value="activity">
              <AdminGridCard title="آخر النشاطات">
                {subject.recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {subject.recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={activity.user.avatar || undefined} />
                            <AvatarFallback>
                              {activity.user.name?.charAt(0) || activity.user.email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">
                              {activity.user.name || "بدون اسم"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {activity.type}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(activity.createdAt).toLocaleString("ar-EG")}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>لا توجد نشاطات حديثة</p>
                  </div>
                )}
              </AdminGridCard>
            </TabsContent>

          </Tabs>
        </div>
      </div>
    </div>
  );
}
