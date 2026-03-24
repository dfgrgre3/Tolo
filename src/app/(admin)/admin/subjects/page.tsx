"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { formatNumber } from "@/lib/utils";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminDataTable, RowActions } from "@/components/admin/ui/admin-table";
import { AdminButton, IconButton } from "@/components/admin/ui/admin-button";
import { AdminCard } from "@/components/admin/ui/admin-card";
import { 
  Plus, LayoutGrid, Users, Book, RefreshCw, PlayCircle, BookOpen, ExternalLink
} from "lucide-react";
import { AdminUpload } from "@/components/admin/ui/admin-upload";
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";

interface Subject {
  id: string;
  name: string;
  nameAr: string | null;
  code: string | null;
  description: string | null;
  icon: string | null;
  color: string | null;
  type: string | null;
  isActive: boolean;
  level: string;
  price: number;
  requirements: string | null;
  instructorName: string | null;
  thumbnailUrl: string | null;
  trailerUrl: string | null;
  _count: {
    enrollments: number;
    topics: number;
  };
}

const subjectSchema = z.object({
  name: z.string().min(1, "English Name is required"),
  nameAr: z.string().min(1, "الاسم العربي مطلوب"),
  code: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
  isActive: z.boolean(),
  level: z.enum(["EASY", "MEDIUM", "HARD", "EXPERT"]),
  price: z.coerce.number().min(0),
  requirements: z.string().optional().nullable(),
  instructorName: z.string().optional().nullable(),
  thumbnailUrl: z.string().optional().nullable(),
  trailerUrl: z.string().optional().nullable(),
});

type SubjectFormValues = z.infer<typeof subjectSchema>;

export default function AdminSubjectsPage() {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingSubject, setEditingSubject] = React.useState<Subject | null>(null);
  const [deleteDialog, setDeleteDialog] = React.useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });

  const { data: subjects = [], isLoading, refetch } = useQuery({
    queryKey: ["admin", "subjects"],
    queryFn: async () => {
      const response = await fetch("/api/admin/subjects");
      const result = await response.json();
      return (result.data?.subjects || []) as Subject[];
    },
  });

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      name: "",
      nameAr: "",
      code: "",
      description: "",
      icon: "📚",
      color: "#6366f1",
      type: "COURSE",
      isActive: true,
      level: "MEDIUM",
      price: 0,
      requirements: "",
      instructorName: "",
      thumbnailUrl: "",
      trailerUrl: "",
    },
  });

  const handleOpenDialog = (subject?: Subject) => {
    if (subject) {
      setEditingSubject(subject);
      form.reset({
        name: subject.name,
        nameAr: subject.nameAr || "",
        code: subject.code || "",
        description: subject.description || "",
        icon: subject.icon || "📚",
        color: subject.color || "#6366f1",
        type: subject.type || "COURSE",
        isActive: subject.isActive,
        level: (subject.level as any) || "MEDIUM",
        price: subject.price || 0,
        requirements: subject.requirements || "",
        instructorName: subject.instructorName || "",
        thumbnailUrl: subject.thumbnailUrl || "",
        trailerUrl: subject.trailerUrl || "",
      });
    } else {
      setEditingSubject(null);
      form.reset({
        name: "",
        nameAr: "",
        code: "",
        description: "",
        icon: "📚",
        color: "#6366f1",
        type: "COURSE",
        isActive: true,
        level: "MEDIUM",
        price: 0,
        requirements: "",
        instructorName: "",
        thumbnailUrl: "",
        trailerUrl: "",
      });
    }
    setDialogOpen(true);
  };

  const onSubmit = async (values: SubjectFormValues) => {
    try {
      const method = editingSubject ? "PATCH" : "POST";
      const body = editingSubject ? { ...values, id: editingSubject.id } : values;
      const response = await fetch("/api/admin/subjects", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(editingSubject ? "تم التحديث بنجاح" : "تم الإنشاء بنجاح");
        setDialogOpen(false);
        refetch();
      } else {
        toast.error("فشل في حفظ البيانات");
      }
    } catch (error) {
      toast.error("خطأ في الاتصال");
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
        toast.success("تم الحذف بنجاح");
        refetch();
      } else {
        toast.error("فشل الحذف");
      }
    } catch (error) {
      toast.error("خطأ في الخادم");
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  const columns: ColumnDef<Subject>[] = [
    {
      accessorKey: "name",
      id: "nameAr",
      header: "المادة الدراسية",
      cell: ({ row }) => {
        const s = row.original;
        return (
          <div className="flex items-center gap-3">
            <div 
              className="h-10 w-10 flex items-center justify-center rounded-lg shadow-sm"
              style={{ backgroundColor: `${s.color}15`, color: s.color || "#6366f1" }}
            >
              <span className="text-xl">{s.icon || "📚"}</span>
            </div>
            <div>
              <p className="font-bold text-sm tracking-tight">{s.nameAr || s.name}</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60 tracking-wider">
                {s.code || "NO-CODE"}
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
        <span className="font-black text-primary text-xs">{formatNumber(row.original.price)} EGP</span>
      ),
    },
    {
      accessorKey: "level",
      header: "المستوى",
      cell: ({ row }) => {
        const levels: Record<string, string> = { EASY: "مبتدئ", MEDIUM: "متوسط", HARD: "متقدم", EXPERT: "خبير" };
        return <Badge variant="outline" className="rounded-full text-[10px]">{levels[row.original.level] || row.original.level}</Badge>;
      }
    },
    {
      accessorKey: "stats",
      header: "الإحصائيات",
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5 text-[10px] font-bold text-muted-foreground">
          <span>{formatNumber(row.original._count?.enrollments || 0)} طالب</span>
          <span>{formatNumber(row.original._count?.topics || 0)} درس</span>
        </div>
      ),
    },
    {
      accessorKey: "isActive",
      header: "الحالة",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "default" : "secondary"} className="rounded-full text-[10px]">
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
          onDelete={(s) => setDeleteDialog({ open: true, id: s.id })}
          extraActions={[
            { icon: LayoutGrid, label: "إدارة المنهج", onClick: (s) => router.push(`/admin/subjects/${s.id}/curriculum`) },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-8 pb-20" dir="rtl">
      <PageHeader title="إدارة الدورات التعليمية 🎓" description="تحكم في المواد الدراسية، المناهج، والأسعار.">
        <AdminButton icon={Plus} onClick={() => handleOpenDialog()}>إضافة مادة</AdminButton>
      </PageHeader>

      <AdminDataTable columns={columns} data={subjects} loading={isLoading} searchKey="nameAr" searchPlaceholder="ابحث..." />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl rounded-3xl overflow-hidden border-none shadow-2xl">
          <DialogHeader dir="rtl">
            <DialogTitle className="text-2xl font-black">{editingSubject ? "تعديل مادة" : "مادة جديدة"}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="nameAr" render={({ field }) => (
                  <FormItem><FormLabel>الاسم بالعربي</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>الاسم بالإنجليزي (ID)</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <div className="grid grid-cols-3 gap-4">
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
                <FormField control={form.control} name="instructorName" render={({ field }) => (
                  <FormItem><FormLabel>المدرس</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <FormField control={form.control} name="thumbnailUrl" render={({ field }) => (
                    <FormItem>
                      <FormLabel>الصورة المصغرة للمادة</FormLabel>
                      <FormControl>
                        <div className="space-y-3">
                          <Input {...field} value={field.value || ""} placeholder="رابط مباشر..." />
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
                      <FormLabel>فيديو المقدمة (Trailer)</FormLabel>
                      <FormControl>
                        <div className="space-y-3">
                          <Input {...field} value={field.value || ""} placeholder="رابط يوتيوب أو مباشر..." />
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
        title="هل أنت متأكد؟"
        description="سيتم حذف المادة نهائياً."
      />
    </div>
  );
}
