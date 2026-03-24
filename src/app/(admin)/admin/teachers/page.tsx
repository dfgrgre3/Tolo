"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminDataTable, RowActions } from "@/components/admin/ui/admin-table";
import { AdminButton, IconButton } from "@/components/admin/ui/admin-button";
import { AdminCard } from "@/components/admin/ui/admin-card";
import { 
  Plus, Edit, Trash2, GraduationCap, ExternalLink, Star, 
  Search, Filter, Users, School, MessageCircle, Globe, RefreshCw
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
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Teacher {
  id: string;
  name: string;
  subjectId: string;
  onlineUrl: string | null;
  rating: number;
  notes: string | null;
  createdAt: string;
  subject: {
    name: string;
    nameAr: string | null;
    color: string | null;
  };
}

const teacherSchema = z.object({
  name: z.string().min(1, "اسم المعلم مطلوب"),
  subjectId: z.string().min(1, "المادة الدراسية مطلوبة"),
  onlineUrl: z.string().url("يجب أن يكون رابطاً صحيحاً").or(z.literal("")),
  notes: z.string().optional(),
});

type TeacherFormValues = z.infer<typeof teacherSchema>;

export default function AdminTeachersPage() {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingTeacher, setEditingTeacher] = React.useState<Teacher | null>(null);
  const [deleteDialog, setDeleteDialog] = React.useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });

  const { data: teachers = [], isLoading, refetch } = useQuery({
    queryKey: ["admin", "teachers"],
    queryFn: async () => {
      const response = await fetch("/api/admin/teachers");
      const result = await response.json();
      return (result.teachers || []) as Teacher[];
    },
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ["admin", "subjects-list"],
    queryFn: async () => {
      const response = await fetch("/api/admin/subjects?limit=100");
      const result = await response.json();
      return (result.subjects || []) as any[];
    },
  });

  const form = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      name: "",
      subjectId: "",
      onlineUrl: "",
      notes: "",
    },
  });

  const handleOpenDialog = (teacher?: Teacher) => {
    if (teacher) {
      setEditingTeacher(teacher);
      form.reset({
        name: teacher.name,
        subjectId: teacher.subjectId,
        onlineUrl: teacher.onlineUrl || "",
        notes: teacher.notes || "",
      });
    } else {
      setEditingTeacher(null);
      form.reset({
        name: "",
        subjectId: "",
        onlineUrl: "",
        notes: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (values: TeacherFormValues) => {
    try {
      const method = editingTeacher ? "PATCH" : "POST";
      const body = editingTeacher ? { ...values, id: editingTeacher.id } : values;
      const response = await fetch("/api/admin/teachers", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(editingTeacher ? "تم تحديث رتبة المعلم" : "تم تعيين قائد علمي جديد");
        setDialogOpen(false);
        refetch();
      } else {
        toast.error("فشل في حفظ بيانات المعلم");
      }
    } catch (error) {
      toast.error("خطأ في الاتصال");
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;
    try {
      const response = await fetch("/api/admin/teachers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteDialog.id }),
      });

      if (response.ok) {
        toast.success("تم عزل المعلم من هيئة التدريس");
        refetch();
      } else {
        toast.error("فشل في العزل");
      }
    } catch (error) {
      toast.error("خطأ في الاتصال");
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  const columns: ColumnDef<Teacher>[] = [
    {
      accessorKey: "name",
      header: "القائد العلمي",
      cell: ({ row }) => {
        const teacher = row.original;
        return (
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 border-2 border-primary/20 shadow-xl p-0.5 bg-background overflow-hidden rounded-[1rem]">
              <AvatarImage src={`https://api.dicebear.com/7.x/notionists/svg?seed=${teacher.name}`} />
              <AvatarFallback className="font-black bg-primary/10 text-primary uppercase">{teacher.name.substring(0, 2)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-black text-sm tracking-tight">{teacher.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div>
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">رتبة: أستاذ قدير</span>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "subject",
      header: "العلم المختص",
      cell: ({ row }) => {
        const subject = row.original.subject;
        return (
          <Badge 
            variant="outline" 
            className="font-black text-[10px] uppercase tracking-wider rounded-lg border-2 px-3 py-1 shadow-sm" 
            style={{ 
              borderColor: subject.color ? `${subject.color}40` : "#3b82f640",
              color: subject.color || "#3b82f6",
              backgroundColor: subject.color ? `${subject.color}10` : "#3b82f610"
            }}
          >
            {subject.nameAr || subject.name}
          </Badge>
        );
      },
    },
    {
      accessorKey: "rating",
      header: "الثقة الملكية",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star 
                key={s} 
                className={`w-3.5 h-3.5 ${s <= Math.round(row.original.rating) ? "text-amber-500 fill-current" : "text-muted opacity-20"}`} 
              />
            ))}
          </div>
          <span className="text-xs font-black">{row.original.rating.toFixed(1)}</span>
        </div>
      ),
    },
    {
      accessorKey: "onlineUrl",
      header: "منصة التواصل",
      cell: ({ row }) => {
        const url = row.original.onlineUrl;
        if (!url) return <span className="text-[10px] font-bold opacity-30 italic">لا يوجد رابط</span>;
        return (
          <AdminButton
            icon={Globe}
            variant="ghost"
            size="sm"
            className="text-primary hover:bg-primary/5 h-8 px-3 gap-2 border-none"
            onClick={() => window.open(url || "", "_blank")}
          >
            <span className="text-[10px] font-black uppercase">زيارة المقر</span>
          </AdminButton>
        );
      },
    },
    {
      id: "actions",
      header: "التحكم",
      cell: ({ row }) => (
        <RowActions
          row={row.original}
          onEdit={handleOpenDialog}
          onDelete={(t) => setDeleteDialog({ open: true, id: t.id })}
          extraActions={[
            { icon: MessageCircle, label: "إرسال رسالة ملكية", onClick: (t) => toast.info(`قريباً: التواصل مع ${t.name}`) },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-10 pb-20" dir="rtl">
      <PageHeader
        title="مجلس الحكماء والعلماء 🎓"
        description="إدارة هيئة التدريس، تخصصات المعلمين، وقنوات التواصل المباشرة مع الطلاب."
      >
        <AdminButton icon={Plus} onClick={() => handleOpenDialog()}>
          تعيين قائد جديد
        </AdminButton>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "كبار العلماء", value: teachers.length, icon: GraduationCap, color: "blue" },
          { label: "متوسط الثقة", value: (teachers.reduce((acc, t) => acc + t.rating, 0) / (teachers.length || 1)).toFixed(1), icon: Star, color: "amber" },
          { label: "تخصصات علمية", value: Array.from(new Set(teachers.map(t => t.subjectId))).length, icon: School, color: "purple" },
          { label: "قادة جدد", value: teachers.filter(t => new Date(t.createdAt).getFullYear() === 2024).length, icon: Users, color: "emerald" },
        ].map((stat, i) => (
          <AdminCard key={i} variant="glass" className={`p-6 bg-${stat.color}-500/5 border-${stat.color}-500/10`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl bg-${stat.color}-500/10 text-${stat.color}-500`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-black">{stat.value}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
              </div>
            </div>
          </AdminCard>
        ))}
      </div>

      <AdminDataTable
        columns={columns}
        data={teachers}
        loading={isLoading}
        searchKey="name"
        searchPlaceholder="ابحث عن اسم المعلم أو التخصص..."
        actions={{ onRefresh: () => refetch() }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md bg-card/80 backdrop-blur-xl border-white/10 rounded-[2.5rem] p-0 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-primary to-blue-500" />
          <div className="p-8">
            <DialogHeader className="mb-8">
              <DialogTitle className="text-2xl font-black">
                {editingTeacher ? "تعديل بيانات الحكيم" : "تعيين معلم جديد"}
              </DialogTitle>
              <DialogDescription className="font-bold text-muted-foreground">
                يرجى إدخال بيانات القائد العلمي بدقة لضمان تواصل فعال مع المحاربين.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">الاسم الكامل للقائد</FormLabel>
                      <FormControl><Input {...field} placeholder="الاسم ثلاثي أو رباعي" className="rounded-2xl border-white/10 bg-white/5 h-12 px-6 focus:ring-1 ring-primary/50" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subjectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">التخصص الدراسي</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="rounded-2xl border-white/10 bg-white/5 h-12 px-6">
                            <SelectValue placeholder="اختر المادة العلمية" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-2xl border-white/10">
                          {subjects.map((subject: any) => (
                            <SelectItem key={subject.id} value={subject.id} className="cursor-pointer py-3">
                              {subject.nameAr || subject.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="onlineUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">رابط القناة الرسمية (URL)</FormLabel>
                      <FormControl><Input {...field} dir="ltr" placeholder="https://..." className="rounded-2xl border-white/10 bg-blue-500/5 text-blue-400 h-12 px-6" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">توصيات ملكية (ملاحظات)</FormLabel>
                      <FormControl><Textarea {...field} className="rounded-2xl border-white/10 bg-white/5 min-h-[100px] p-6 focus:ring-1 ring-primary/50" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="pt-4">
                  <AdminButton type="submit" className="w-full h-14 text-md font-black shadow-xl">
                    {editingTeacher ? "حفظ المرسوم الملكي" : "اعتماد القائد رسمياً"}
                  </AdminButton>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: null })}
        title="تأكيد العزل النهائي؟"
        description="أنت على وشك عزل هذا القائد العلمي من هيئة التدريس بالمملكة. هل أنت متأكد من هذا القرار؟"
        confirmText="نعم، اعزله"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
