"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminDataTable, RowActions } from "@/components/admin/ui/admin-table";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { AdminCard } from "@/components/admin/ui/admin-card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, Edit, Trash2, Megaphone, Bell, Calendar, Eye, 
  AlertTriangle, CheckCircle, Info, ShieldAlert, Zap, Send
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
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useQuery } from "@tanstack/react-query";

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
  author: {
    id: string;
    name: string | null;
    avatar: string | null;
  };
}

const announcementSchema = z.object({
  title: z.string().min(1, "عنوان البلاغ مطلوب"),
  content: z.string().min(1, "محتوى المنشور مطلوب"),
  type: z.string(),
  priority: z.number(),
  isActive: z.boolean(),
});

type AnnouncementFormValues = z.infer<typeof announcementSchema>;

export default function AdminAnnouncementsPage() {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = React.useState<Announcement | null>(null);
  const [deleteDialog, setDeleteDialog] = React.useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });

  const { data: announcements = [], isLoading, refetch } = useQuery({
    queryKey: ["admin", "announcements"],
    queryFn: async () => {
      const response = await fetch("/api/admin/announcements");
      const result = await response.json();
      return (result.announcements || []) as Announcement[];
    },
  });

  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: "",
      content: "",
      type: "INFO",
      priority: 0,
      isActive: true,
    },
  });

  const handleOpenDialog = (announcement?: Announcement) => {
    if (announcement) {
      setEditingAnnouncement(announcement);
      form.reset({
        title: announcement.title,
        content: announcement.content,
        type: announcement.type,
        priority: announcement.priority,
        isActive: announcement.isActive,
      });
    } else {
      setEditingAnnouncement(null);
      form.reset({
        title: "",
        content: "",
        type: "INFO",
        priority: 0,
        isActive: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (values: AnnouncementFormValues) => {
    try {
      const method = editingAnnouncement ? "PATCH" : "POST";
      const body = editingAnnouncement ? { ...values, id: editingAnnouncement.id } : { ...values, authorId: "admin" };
      const response = await fetch("/api/admin/announcements", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(editingAnnouncement ? "تم تعديل البلاغ الملكي" : "تم نشر البلاغ في أرجاء المملكة");
        setDialogOpen(false);
        refetch();
      } else {
        toast.error("فشل في حفظ البلاغ");
      }
    } catch (error) {
      toast.error("خطأ في الاتصال");
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;
    try {
      const response = await fetch("/api/admin/announcements", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteDialog.id }),
      });

      if (response.ok) {
        toast.success("تم سحب البلاغ وحرقه");
        refetch();
      } else {
        toast.error("فشل في السحب");
      }
    } catch (error) {
      toast.error("خطأ في الاتصال");
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  const typeConfig: Record<string, { label: string, color: string, icon: any }> = {
    INFO: { label: "بلاغ عام", color: "blue", icon: Info },
    SUCCESS: { label: "بشرى سارة", color: "emerald", icon: CheckCircle },
    WARNING: { label: "تنبيه هام", color: "amber", icon: AlertTriangle },
    ERROR: { label: "تحذير قصوى", color: "red", icon: ShieldAlert },
  };

  const columns: ColumnDef<Announcement>[] = [
    {
      accessorKey: "title",
      header: "البلاغ المنشور",
      cell: ({ row }) => {
        const announcement = row.original;
        const config = typeConfig[announcement.type] || typeConfig.INFO;
        return (
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl bg-${config.color}-500/10 text-${config.color}-500 shadow-sm border border-${config.color}-500/10`}>
              <config.icon className="w-5 h-5" />
            </div>
            <div className="max-w-[300px]">
              <p className="font-black text-sm tracking-tight">{announcement.title}</p>
              <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5 font-bold uppercase opacity-60">
                {announcement.content}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "type",
      header: "الرتبة والدلالة",
      cell: ({ row }) => {
        const type = row.original.type;
        const config = typeConfig[type] || typeConfig.INFO;
        return (
          <Badge 
            variant="outline" 
            className={`font-black text-[10px] uppercase tracking-widest rounded-lg border-2 px-3 py-1 bg-${config.color}-500/5 text-${config.color}-500 border-${config.color}-500/20`}
          >
            {config.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "isActive",
      header: "الحالة الآن",
      cell: ({ row }) => {
        const active = row.original.isActive;
        return (
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${active ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500/30"}`} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${active ? "text-emerald-500" : "text-muted-foreground"}`}>
              {active ? "منشور بوضوح" : "مخفي في السجلات"}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "توقيت الإطلاق",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-xs font-black">{new Date(row.original.createdAt).toLocaleDateString("ar-EG")}</span>
          <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-50">{new Date(row.original.createdAt).toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      ),
    },
    {
      id: "actions",
      header: "التحكم الإمبراطوري",
      cell: ({ row }) => (
        <RowActions
          row={row.original}
          onEdit={handleOpenDialog}
          onDelete={(a) => setDeleteDialog({ open: true, id: a.id })}
          extraActions={[
            { icon: Send, label: "إعادة إرسال كـ Notification", onClick: (a) => toast.info(`قريباً: دفع البلاغ ${a.title} للأجهزة`) },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-10 pb-20" dir="rtl">
      <PageHeader
        title="منصة البلاغات الملكية (Herald) 📢"
        description="إدارة التواصل العام مع المحاربين، نشر الأخبار، التحذيرات، والاحتفالات الكبرى بالمملكة."
      >
        <AdminButton icon={Plus} onClick={() => handleOpenDialog()}>
          صياغة بلاغ جديد
        </AdminButton>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "إجمالي المنشورات", value: announcements.length, icon: Megaphone, color: "blue" },
          { label: "بلاغات نشطة", value: announcements.filter(a => a.isActive).length, icon: Zap, color: "emerald" },
          { label: "بلاغات الأسبوع", value: announcements.filter(a => new Date(a.createdAt) > new Date(Date.now() - 7 * 86400000)).length, icon: Calendar, color: "purple" },
          { label: "تنبيهات عاجلة", value: announcements.filter(a => a.type === "WARNING" || a.type === "ERROR").length, icon: AlertTriangle, color: "red" },
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
        data={announcements}
        loading={isLoading}
        searchKey="title"
        searchPlaceholder="ابحث في أرشيف البلاغات..."
        actions={{ onRefresh: () => refetch() }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md bg-card/80 backdrop-blur-xl border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
          <div className="h-1.5 bg-gradient-to-r from-primary via-blue-500 to-purple-500" />
          <div className="p-8">
            <DialogHeader className="mb-8">
              <DialogTitle className="text-2xl font-black">
                {editingAnnouncement ? "تعديل نص البلاغ" : "صياغة بلاغ ملكي جديد"}
              </DialogTitle>
              <DialogDescription className="font-bold text-muted-foreground">
                اختر نبرة الصوت المناسبة (النوع) واكتب النص بعناية لتصل الرسالة للجنود بوضوح.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">مانشيت البلاغ (العنوان)</FormLabel>
                      <FormControl><Input {...field} placeholder="تنبيه هام بخصوص..." className="rounded-2xl border-white/10 bg-white/5 h-12 px-6 font-bold" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">تفاصيل المرسوم (المحتوى)</FormLabel>
                      <FormControl><Textarea {...field} className="rounded-2xl border-white/10 bg-white/5 min-h-[120px] p-6 font-medium" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">نبرة البلاغ</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="rounded-2xl border-white/10 bg-white/5 h-12">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-2xl border-white/10">
                            <SelectItem value="INFO" className="cursor-pointer py-3 font-bold">بلاغ عام (معلومة)</SelectItem>
                            <SelectItem value="SUCCESS" className="cursor-pointer py-3 font-bold text-emerald-500">بشرى (نجاح)</SelectItem>
                            <SelectItem value="WARNING" className="cursor-pointer py-3 font-bold text-amber-500">تنبيه (هام)</SelectItem>
                            <SelectItem value="ERROR" className="cursor-pointer py-3 font-bold text-red-500">تحذير (قصوى)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">مستوى الظهور</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            className="rounded-2xl border-white/10 bg-white/5 h-12 text-center font-black"
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-2xl border border-white/10 p-4 bg-white/5">
                      <div>
                        <FormLabel className="font-black text-xs">نشر فوري؟</FormLabel>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">تفعيل الظهور في لوحة الطالب الآن</p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <DialogFooter className="pt-4">
                  <AdminButton type="submit" className="w-full h-14 text-md font-black shadow-xl rounded-2xl">
                    {editingAnnouncement ? "تحديث البلاغ" : "إخطار المملكة الآن"}
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
        title="حرق البلاغ نهائياً؟"
        description="أنت على وشك حذف هذا البلاغ الملكي من جميع السجلات العامة والخاصة. هذا القرار لا يمكن الرجوع عنه."
        confirmText="نعم، احرقه"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
