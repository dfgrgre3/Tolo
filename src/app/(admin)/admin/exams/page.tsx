"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/ui/page-header";
import { DataTable } from "@/components/admin/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MoreHorizontal, Plus, Edit, Trash2, ExternalLink, Target, LayoutGrid, List, Search, Filter, FileText, Eye, Calendar, Users, Clock } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { TableSkeleton } from "@/components/admin/ui/loading-skeleton";
import { Card, CardContent } from "@/components/ui/card";

interface Exam {
  id: string;
  title: string;
  year: number;
  url: string;
  type: string | null;
  createdAt: string;
  subject: {
    id: string;
    name: string;
    nameAr: string | null;
  };
  _count: {
    results: number;
  };
}

interface Subject {
  id: string;
  name: string;
  nameAr: string | null;
}

const examSchema = z.object({
  title: z.string().min(1, "عنوان الامتحان مطلوب"),
  subjectId: z.string().min(1, "المادة مطلوبة"),
  year: z.number().min(2000).max(2100),
  url: z.string().min(1, "رابط الامتحان مطلوب"),
  type: z.string().optional(),
});

type ExamFormValues = z.infer<typeof examSchema>;

export default function AdminExamsPage() {
  const [exams, setExams] = React.useState<Exam[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [deleteDialog, setDeleteDialog] = React.useState<{
    open: boolean;
    id: string | null;
  }>({ open: false, id: null });
  const [viewMode, setViewMode] = React.useState<"table" | "grid">("table");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [subjectFilter, setSubjectFilter] = React.useState<string>("");
  const [previewExam, setPreviewExam] = React.useState<Exam | null>(null);

  const form = useForm<ExamFormValues>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      title: "",
      subjectId: "",
      year: new Date().getFullYear(),
      url: "",
      type: "",
    },
  });

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [examsRes, subjectsRes] = await Promise.all([
        fetch("/api/admin/exams"),
        fetch("/api/admin/subjects?limit=100"),
      ]);
      const examsData = await examsRes.json();
      const subjectsData = await subjectsRes.json();
      setExams(examsData.exams);
      setSubjects(subjectsData.subjects);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("حدث خطأ أثناء جلب البيانات");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (values: ExamFormValues) => {
    try {
      const response = await fetch("/api/admin/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        toast.success("تم إنشاء الامتحان بنجاح");
        setDialogOpen(false);
        form.reset();
        fetchData();
      } else {
        toast.error("حدث خطأ أثناء حفظ الامتحان");
      }
    } catch (error) {
      console.error("Error saving exam:", error);
      toast.error("حدث خطأ أثناء حفظ الامتحان");
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;

    try {
      const response = await fetch("/api/admin/exams", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteDialog.id }),
      });

      if (response.ok) {
        toast.success("تم حذف الامتحان بنجاح");
        fetchData();
      } else {
        toast.error("حدث خطأ أثناء حذف الامتحان");
      }
    } catch (error) {
      console.error("Error deleting exam:", error);
      toast.error("حدث خطأ أثناء حذف الامتحان");
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  const columns: ColumnDef<Exam>[] = [
    {
      accessorKey: "title",
      header: "الامتحان",
      cell: ({ row }) => {
        const exam = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <Target className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="font-medium">{exam.title}</p>
              <p className="text-sm text-muted-foreground">{exam.year}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "subject",
      header: "المادة",
      cell: ({ row }) => {
        const exam = row.original;
        return (
          <Badge variant="outline">
            {exam.subject.nameAr || exam.subject.name}
          </Badge>
        );
      },
    },
    {
      accessorKey: "type",
      header: "النوع",
      cell: ({ row }) => row.getValue("type") || "-",
    },
    {
      id: "results",
      header: "النتائج",
      cell: ({ row }) => {
        const exam = row.original;
        return <span>{exam._count.results} نتيجة</span>;
      },
    },
    {
      accessorKey: "createdAt",
      header: "تاريخ الإضافة",
      cell: ({ row }) => {
        const date = row.getValue("createdAt") as string;
        return new Date(date).toLocaleDateString("ar-EG");
      },
    },
    {
      id: "actions",
      header: "الإجراءات",
      cell: ({ row }) => {
        const exam = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.open(exam.url, "_blank")}>
                <ExternalLink className="ml-2 h-4 w-4" />
                عرض الامتحان
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setDeleteDialog({ open: true, id: exam.id })}
              >
                <Trash2 className="ml-2 h-4 w-4" />
                حذف
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Exam Card for Grid View
  const ExamCard = ({ exam }: { exam: Exam }) => (
    <Card className="group hover:shadow-lg transition-all hover:-translate-y-0.5">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80">
              <FileText className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold line-clamp-1">{exam.title}</p>
              <p className="text-sm text-muted-foreground">{exam.year}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setPreviewExam(exam)}>
                <Eye className="ml-2 h-4 w-4" />
                معاينة
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.open(exam.url, "_blank")}>
                <ExternalLink className="ml-2 h-4 w-4" />
                فتح الرابط
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setDeleteDialog({ open: true, id: exam.id })}
              >
                <Trash2 className="ml-2 h-4 w-4" />
                حذف
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <Badge variant="outline">
            {exam.subject.nameAr || exam.subject.name}
          </Badge>
          {exam.type && (
            <Badge variant="secondary">{exam.type}</Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-center text-sm">
          <div className="rounded-lg bg-muted/50 p-2">
            <p className="font-bold text-primary">{exam._count.results}</p>
            <p className="text-xs text-muted-foreground">نتيجة</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2">
            <p className="font-bold text-primary">{new Date(exam.createdAt).toLocaleDateString("ar-EG", { month: "short", year: "numeric" })}</p>
            <p className="text-xs text-muted-foreground">تاريخ الإضافة</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Filter exams
  const filteredExams = React.useMemo(() => {
    return exams.filter(exam => {
      const matchesSearch = !searchQuery || 
        exam.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSubject = !subjectFilter || exam.subject.id === subjectFilter;
      return matchesSearch && matchesSubject;
    });
  }, [exams, searchQuery, subjectFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="إدارة الامتحانات"
        description="عرض وإدارة جميع الامتحانات المتاحة في الموقع"
      >
        <Button onClick={() => setDialogOpen(true)} size="sm" className="rounded-lg">
          <Plus className="ml-2 h-4 w-4" />
          إضافة امتحان
        </Button>
      </PageHeader>

      {/* Filters & View Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="البحث عن امتحان..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9 w-64 h-9 rounded-lg"
            />
          </div>
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-40 h-9 rounded-lg">
              <SelectValue placeholder="فلترة بالمادة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل المواد</SelectItem>
              {subjects.map(subject => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.nameAr || subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 rounded-lg border p-1">
          <Button
            variant={viewMode === "table" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("table")}
            className="h-7 px-2"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className="h-7 px-2"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "إجمالي الامتحانات", value: exams.length, icon: FileText, color: "text-primary" },
          { label: "إجمالي النتائج", value: exams.reduce((acc, e) => acc + e._count.results, 0), icon: Target, color: "text-green-500" },
          { label: "امتحانات هذا العام", value: exams.filter(e => e.year === new Date().getFullYear()).length, icon: Calendar, color: "text-blue-500" },
          { label: "المواد المتاحة", value: subjects.length, icon: Users, color: "text-purple-500" },
        ].map((stat, i) => (
          <div key={i} className="rounded-xl border bg-card p-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50">
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <div>
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : viewMode === "table" ? (
        <DataTable
          columns={columns}
          data={filteredExams}
          searchKey="title"
          searchPlaceholder="البحث عن امتحان..."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredExams.map((exam) => (
            <ExamCard key={exam.id} exam={exam} />
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewExam} onOpenChange={() => setPreviewExam(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              معاينة الامتحان
            </DialogTitle>
          </DialogHeader>
          {previewExam && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground mb-1">العنوان</p>
                  <p className="font-semibold">{previewExam.title}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground mb-1">المادة</p>
                  <p className="font-semibold">{previewExam.subject.nameAr || previewExam.subject.name}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground mb-1">السنة</p>
                  <p className="font-semibold">{previewExam.year}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground mb-1">النوع</p>
                  <p className="font-semibold">{previewExam.type || "-"}</p>
                </div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">الرابط</p>
                <a 
                  href={previewExam.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline break-all"
                >
                  {previewExam.url}
                </a>
              </div>
              {previewExam.url.includes("pdf") || previewExam.url.includes("drive.google") ? (
                <div className="rounded-lg border overflow-hidden bg-muted/30 h-96">
                  <iframe 
                    src={previewExam.url} 
                    className="w-full h-full"
                    title="معاينة الامتحان"
                  />
                </div>
              ) : (
                <Button onClick={() => window.open(previewExam.url, "_blank")} className="w-full">
                  <ExternalLink className="ml-2 h-4 w-4" />
                  فتح الرابط في نافذة جديدة
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة امتحان جديد</DialogTitle>
            <DialogDescription>
              أدخل بيانات الامتحان
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>عنوان الامتحان *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subjectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المادة *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر المادة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.nameAr || subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>السنة *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>النوع</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رابط الامتحان *</FormLabel>
                    <FormControl>
                      <Input {...field} type="url" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit">إنشاء</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: null })}
        title="حذف الامتحان"
        description="هل أنت متأكد من حذف هذا الامتحان؟"
        confirmText="حذف"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
