"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminDataTable, RowActions } from "@/components/admin/ui/admin-table";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { AdminCard } from "@/components/admin/ui/admin-card";
import {
  Plus, Users, LayoutGrid, DollarSign, PlayCircle, GraduationCap, RefreshCw, BookOpen, ExternalLink
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { 
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { AdminUpload } from "@/components/admin/ui/admin-upload";

interface Subject {
  id: string;
  name: string;
  nameAr: string | null;
  code: string | null;
  description: string | null;
  price: number;
  level: string;
  instructorName: string | null;
  thumbnailUrl: string | null;
  trailerUrl: string | null;
  isActive: boolean;
  _count: {
    enrollments: number;
    topics: number;
    teachers?: number;
  };
}

const courseSchema = z.object({
  name: z.string().min(1, "English name is required"),
  nameAr: z.string().min(1, "الاسم العربي مطلوب"),
  price: z.coerce.number().min(0),
  level: z.enum(["EASY", "MEDIUM", "HARD", "EXPERT"]),
  instructorName: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  isActive: z.boolean(),
  thumbnailUrl: z.string().optional().nullable(),
  trailerUrl: z.string().optional().nullable(),
});

type CourseFormValues = z.infer<typeof courseSchema>;

export default function AdminCoursesPage() {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingCourse, setEditingCourse] = React.useState<Subject | null>(null);
  const [deleteDialog, setDeleteDialog] = React.useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });

  const { data: courses = [], isLoading, refetch } = useQuery({
    queryKey: ["admin", "courses"],
    queryFn: async () => {
      const response = await fetch("/api/admin/subjects?limit=100");
      const result = await response.json();
      return (result.data?.subjects || []) as Subject[];
    },
  });

  const totalEnrollments = React.useMemo(
    () => courses.reduce((total, course) => total + (course._count?.enrollments || 0), 0),
    [courses]
  );

  const totalCurriculumUnits = React.useMemo(
    () => courses.reduce((total, course) => total + (course._count?.topics || 0), 0),
    [courses]
  );

  const activeCoursesCount = React.useMemo(
    () => courses.filter((course) => course.isActive).length,
    [courses]
  );

  const averagePrice = React.useMemo(() => {
    if (courses.length === 0) {
      return 0;
    }

    return Math.round(courses.reduce((total, course) => total + (course.price || 0), 0) / courses.length);
  }, [courses]);

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      name: "",
      nameAr: "",
      price: 0,
      level: "MEDIUM",
      instructorName: "",
      description: "",
      isActive: true,
      thumbnailUrl: "",
      trailerUrl: "",
    },
  });

  const handleOpenDialog = (course?: Subject) => {
    if (course) {
      setEditingCourse(course);
      form.reset({
        name: course.name,
        nameAr: course.nameAr || "",
        price: course.price || 0,
        level: (course.level as any) || "MEDIUM",
        instructorName: course.instructorName || "",
        description: course.description || "",
        isActive: course.isActive,
        thumbnailUrl: course.thumbnailUrl || "",
        trailerUrl: course.trailerUrl || "",
      });
    } else {
      setEditingCourse(null);
      form.reset({
        name: "",
        nameAr: "",
        price: 0,
        level: "MEDIUM",
        instructorName: "",
        description: "",
        isActive: true,
        thumbnailUrl: "",
        trailerUrl: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (values: CourseFormValues) => {
    try {
      const method = editingCourse ? "PATCH" : "POST";
      const body = editingCourse ? { ...values, id: editingCourse.id } : values;
      const response = await fetch("/api/admin/subjects", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(editingCourse ? "تم تحديث الدورة بنجاح" : "تم إنشاء دورة جديدة");
        setDialogOpen(false);
        refetch();
      } else {
        toast.error("فشل في حفظ البيانات");
      }
    } catch (error) {
      toast.error("خطأ في الاتصال بالخادم");
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;
    try {
      const response = await fetch("/api/admin/subjects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteDialog.id }),
      });

      if (response.ok) {
        toast.success("تم حذف الدورة بنجاح");
        refetch();
      } else {
        toast.error("فشل في حذف الدورة");
      }
    } catch (error) {
      toast.error("خطأ في الاتصال");
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  const columns: ColumnDef<Subject>[] = [
    {
      accessorKey: "name",
      id: "nameAr",
      header: "الدورة التدريبية",
      cell: ({ row }) => {
        const course = row.original;
        return (
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-24 overflow-hidden rounded-xl border bg-muted shadow-sm">
              {course.thumbnailUrl ? (
                <img src={course.thumbnailUrl} alt={course.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500/20 to-indigo-500/20">
                  <PlayCircle className="h-6 w-6 text-primary" />
                </div>
              )}
            </div>
            <div>
              <p className="font-bold text-sm">{course.nameAr || course.name}</p>
              <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                <GraduationCap className="w-3 h-3" />
                {course.instructorName || "غير محدد"}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "price",
      header: "السعر",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 font-black text-primary">
          <DollarSign className="w-3.5 h-3.5" />
          <span>{row.original.price || 0} EGP</span>
        </div>
      ),
    },
    {
      id: "enrollments",
      header: "المشتركين",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 font-bold text-sm">
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
          <span>{row.original._count?.enrollments || 0}</span>
        </div>
      ),
    },
    {
      id: "topics",
      header: "المحتوى",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 font-bold text-sm">
          <LayoutGrid className="w-3.5 h-3.5 text-muted-foreground" />
          <span>{row.original._count?.topics || 0} وحدات</span>
        </div>
      ),
    },
    {
      accessorKey: "level",
      header: "المستوى",
      cell: ({ row }) => {
        const colors: Record<string, string> = {
          EASY: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
          MEDIUM: "bg-blue-500/10 text-blue-500 border-blue-500/20",
          HARD: "bg-orange-500/10 text-orange-500 border-orange-500/20",
          EXPERT: "bg-rose-500/10 text-rose-500 border-rose-500/20",
        };
        const labels: Record<string, string> = { EASY: "مبتدئ", MEDIUM: "متوسط", HARD: "متقدم", EXPERT: "خبير" };
        const level = (row.original.level || "MEDIUM") as string;
        return (
          <Badge variant="outline" className={`rounded-full px-2 py-0 text-[10px] font-bold ${colors[level] || colors.MEDIUM}`}>
            {labels[level] || level}
          </Badge>
        );
      },
    },
    {
      accessorKey: "isActive",
      header: "الحالة",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "default" : "secondary"} className="rounded-full px-2.5 py-0.5 font-bold text-[10px]">
          {row.original.isActive ? "نشط" : "مسودة"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "إجراءات",
      cell: ({ row }) => (
        <RowActions
          row={row.original}
          onEdit={handleOpenDialog}
          onDelete={(c) => setDeleteDialog({ open: true, id: c.id })}
          extraActions={[
            { icon: PlayCircle, label: "إدارة المحتوى", onClick: (c) => router.push(`/admin/courses/${c.id}/curriculum`) },
            { icon: BookOpen, label: "تفاصيل الدورة", onClick: (c) => router.push(`/admin/courses/${c.id}`) },
            { icon: ExternalLink, label: "عرض بالموقع", onClick: (c) => router.push(`/courses/${c.id}`) },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-8 pb-20" dir="rtl">
      <PageHeader
        title="إدارة الدورات التدريبية 🎓"
        description="أنشئ وأدر الدورات، حدد الأسعار، وراقب مبيعاتك."
      >
        <AdminButton icon={Plus} onClick={() => handleOpenDialog()}>
          إنشاء دورة جديدة
        </AdminButton>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <AdminCard variant="glass" className="p-5">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 shadow-inner">
              <PlayCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-black">{courses.length}</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">إجمالي الدورات</p>
            </div>
          </div>
        </AdminCard>
        <AdminCard variant="glass" className="p-5">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 shadow-inner">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-black">{totalEnrollments}</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">إجمالي المشتركين</p>
            </div>
          </div>
        </AdminCard>
        <AdminCard variant="glass" className="p-5">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-500 shadow-inner">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-black">{totalCurriculumUnits}</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">وحدات المنهج</p>
            </div>
          </div>
        </AdminCard>
        <AdminCard variant="glass" className="p-5">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 shadow-inner">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-black">{averagePrice} EGP</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {activeCoursesCount} / {courses.length} دورات نشطة
              </p>
            </div>
          </div>
        </AdminCard>
      </div>

      <AdminDataTable
        columns={columns}
        data={courses}
        loading={isLoading}
        searchKey="nameAr"
        searchPlaceholder="ابحث..."
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl rounded-3xl">
          <DialogHeader dir="rtl">
            <DialogTitle className="text-2xl font-black">{editingCourse ? "تعديل الدورة" : "دورة جديدة"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="nameAr" render={({ field }) => (
                  <FormItem><FormLabel>الاسم بالعربي</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>English Name (ID)</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="price" render={({ field }) => (
                  <FormItem><FormLabel>السعر</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="level" render={({ field }) => (
                  <FormItem><FormLabel>المستوى</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="EASY">مبتدئ</SelectItem>
                        <SelectItem value="MEDIUM">متوسط</SelectItem>
                        <SelectItem value="HARD">متقدم</SelectItem>
                        <SelectItem value="EXPERT">خبير</SelectItem>
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <FormField control={form.control} name="thumbnailUrl" render={({ field }) => (
                    <FormItem>
                      <FormLabel>الصورة المصغرة</FormLabel>
                      <FormControl>
                        <div className="space-y-3">
                          <Input {...field} value={field.value || ""} placeholder="رابط مباشر للصورة..." />
                          <AdminUpload 
                            accept="image/*" 
                            label="رفع صورة من الجهاز" 
                            onUploadComplete={(url) => field.onChange(url)} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="space-y-4">
                  <FormField control={form.control} name="trailerUrl" render={({ field }) => (
                    <FormItem>
                      <FormLabel>فيديو الإعلان</FormLabel>
                      <FormControl>
                        <div className="space-y-3">
                          <Input {...field} value={field.value || ""} placeholder="رابط يوتيوب أو فيديو مباشر..." />
                          <AdminUpload 
                            accept="video/*" 
                            label="رفع فيديو من الجهاز" 
                            onUploadComplete={(url) => field.onChange(url)} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>الوصف</FormLabel><FormControl><Textarea {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
              )} />

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl">
                <p className="font-bold">الحالة</p>
                <FormField control={form.control} name="isActive" render={({ field }) => (
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                )} />
              </div>

              <DialogFooter>
                <AdminButton type="submit" className="w-full h-12 text-lg font-black" icon={RefreshCw}>حفظ</AdminButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: null })}
        onConfirm={handleDelete}
        title="حذف؟"
        description="سيتم الحذف نهائياً."
      />
    </div>
  );
}
