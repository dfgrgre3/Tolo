"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminDataTable, RowActions } from "@/components/admin/ui/admin-table";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { AdminStatsCard } from "@/components/admin/ui/admin-card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, Megaphone, Calendar, 
  AlertTriangle, CheckCircle, Info, ShieldAlert, Zap, Send, Search,
  Edit, Sparkles, Trash2
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AdminConfirm } from "@/components/admin/ui/admin-confirm";
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
import { m } from "framer-motion";
import { apiRoutes } from "@/lib/api/routes";

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

interface AnnouncementsResponse {
  announcements: Announcement[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const announcementSchema = z.object({
  title: z.string().min(1, "عنوان الإعلان مطلوب"),
  content: z.string().min(1, "محتوى الإعلان مطلوب"),
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
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);
  const [search, setSearch] = React.useState("");
  const deferredSearch = React.useDeferredValue(search);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "announcements", page, limit, deferredSearch],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (deferredSearch) {
        params.set("search", deferredSearch);
      }

      const response = await fetch(`${apiRoutes.admin.announcements}?${params.toString()}`);
      const json = await response.json();
      return (json.data || json) as AnnouncementsResponse;
    },
  });

  const announcements = data?.announcements || [];
  const pagination = data?.pagination;

  React.useEffect(() => {
    setPage(1);
  }, [deferredSearch]);

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
      const response = await fetch(apiRoutes.admin.announcements, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(editingAnnouncement ? "تم تعديل الإعلان بنجاح" : "تم نشر الإعلان للمستخدمين بنجاح");
        setDialogOpen(false);
        refetch();
      } else {
        toast.error("فشل في حفظ الإعلان");
      }
    } catch (_error) {
      toast.error("خطأ في الاتصال");
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;
    try {
      const response = await fetch(apiRoutes.admin.announcements, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteDialog.id }),
      });

      if (response.ok) {
        toast.success("تم حذف الإعلان بنجاح");
        refetch();
      } else {
        toast.error("فشل في حذف الإعلان");
      }
    } catch (_error) {
      toast.error("خطأ في الاتصال");
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  const typeConfig: Record<string, { label: string, color: "blue" | "green" | "yellow" | "red" | "purple" | "default", icon: React.ComponentType<{ className?: string }> }> = {
    INFO: { label: "إعلان عام", color: "blue", icon: Info },
    SUCCESS: { label: "خبر سار", color: "green", icon: CheckCircle },
    WARNING: { label: "تنبيه هام", color: "yellow", icon: AlertTriangle },
    ERROR: { label: "تحذير عاجل", color: "red", icon: ShieldAlert },
  };

  const columns: ColumnDef<Announcement>[] = [
    {
      accessorKey: "title",
      header: "الإعلان",
      cell: ({ row }) => {
        const announcement = row.original;
        const config = typeConfig[announcement.type] || typeConfig.INFO;
        return (
          <div className="flex items-center gap-4">
            <div 
              className="flex h-12 w-12 items-center justify-center rounded-[1rem] border border-white/10 shadow-sm transition-transform hover:scale-105"
              style={{ backgroundColor: `oklch(var(--${config.color}) / 0.1)`, color: `oklch(var(--${config.color}))` }}
            >
              <config.icon className="h-6 w-6" />
            </div>
            <div className="max-w-[300px]">
              <p className="font-black text-sm tracking-tight">{announcement.title}</p>
              <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5 font-bold uppercase opacity-60 italic">
                {announcement.content}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "type",
      header: "نوع الإعلان",
      cell: ({ row }) => {
        const type = row.original.type;
        const config = typeConfig[type] || typeConfig.INFO;
        return (
          <Badge 
            variant="outline" 
            className="font-black text-[10px] uppercase tracking-widest rounded-lg border-2 px-3 py-1 bg-white/5"
            style={{ color: `oklch(var(--${config.color}))`, borderColor: `oklch(var(--${config.color}) / 0.3)` }}
          >
            {config.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "isActive",
      header: "الحالة",
      cell: ({ row }) => {
        const active = row.original.isActive;
        return (
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${active ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500/30"}`} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${active ? "text-emerald-500" : "text-muted-foreground"}`}>
              {active ? "نشط" : "مخفي"}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "تاريخ النشر",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-xs font-black">{new Date(row.original.createdAt).toLocaleDateString("ar-EG")}</span>
          <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-50">{new Date(row.original.createdAt).toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      ),
    },
    {
      id: "actions",
      header: "الإجراءات",
      cell: ({ row }) => (
        <RowActions
          row={row.original}
          onEdit={handleOpenDialog}
          onDelete={(a) => setDeleteDialog({ open: true, id: a.id })}
          extraActions={[
            { icon: Send, label: "إعادة إرسال كإشعار", onClick: (a) => toast.info(`قريباً: دفع الإعلان ${a.title} كإشعار لحظي`) },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-10 pb-20" dir="rtl">
      <PageHeader
        title="إدارة الإعلانات والتنبيهات 📢"
        description="إدارة التواصل العام مع المستخدمين، نشر الأخبار، التحذيرات، والفعاليات القادمة."
      >
        <AdminButton icon={Plus} onClick={() => handleOpenDialog()}>
          إضافة إعلان جديد
        </AdminButton>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <AdminStatsCard 
          title="إجمالي الإعلانات" 
          value={pagination?.total || 0} 
          icon={Megaphone} 
          color="blue"
          description="إعلان في سجلات النظام"
        />
        <AdminStatsCard 
          title="إعلانات نشطة" 
          value={announcements.filter(a => a.isActive).length} 
          icon={Zap} 
          color="green"
          description="تظهر حالياً للمستخدمين"
        />
        <AdminStatsCard 
          title="إعلانات الأسبوع" 
          value={announcements.filter(a => new Date(a.createdAt) > new Date(Date.now() - 7 * 86400000)).length} 
          icon={Calendar} 
          color="purple"
          description="آخر 7 أيام"
        />
        <AdminStatsCard 
          title="تنبيهات عاجلة" 
          value={announcements.filter(a => a.type === "WARNING" || a.type === "ERROR").length} 
          icon={AlertTriangle} 
          color="red"
          description="حالات تستوجب المتابعة"
        />
      </div>

      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="admin-glass p-1 rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl"
      >
        <AdminDataTable
          columns={columns}
          data={announcements}
          loading={isLoading}
          serverSide
          totalRows={pagination?.total || 0}
          pageCount={pagination?.totalPages || 1}
          currentPage={page}
          onPageChange={setPage}
          onPageSizeChange={setLimit}
          pageSize={limit}
          actions={{ onRefresh: () => refetch() }}
          toolbar={
            <div className="relative">
              <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground opacity-50" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ابحث في سجلات الإعلانات..."
                className="h-12 w-80 rounded-2xl border border-white/10 bg-white/5 pr-12 pl-6 text-sm font-bold outline-none ring-primary transition focus:ring-1 focus:bg-white/10"
              />
            </div>
          }
        />
      </m.div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md bg-card/80 backdrop-blur-xl border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
          <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
          <div className="p-8">
            <DialogHeader className="mb-8">
              <DialogTitle className="text-2xl font-black flex items-center gap-3">
                {editingAnnouncement ? (
                  <>
                    <Edit className="w-7 h-7 text-indigo-500" />
                    تعديل نص الإعلان
                  </>
                ) : (
                  <>
                    <Sparkles className="w-7 h-7 text-blue-500" />
                    إضافة إعلان جديد
                  </>
                )}
              </DialogTitle>
              <DialogDescription className="font-bold text-muted-foreground">
                قم باختيار نوع الإعلان وكتابة المحتوى بعناية ليظهر للمستخدمين.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">عنوان الإعلان</FormLabel>
                      <FormControl><Input {...field} placeholder="تنبيه هام بخصوص..." className="rounded-xl border-white/10 bg-white/5 h-12 px-6 font-bold" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">محتوى الإعلان</FormLabel>
                      <FormControl><Textarea {...field} placeholder="أعزائي الطلاب والمستخدمين..." className="rounded-2xl border-white/10 bg-white/5 min-h-[120px] p-6 font-medium" /></FormControl>
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
                        <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">نوع الإعلان</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="rounded-xl border-white/10 bg-white/5 h-12">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl border-white/10">
                            <SelectItem value="INFO" className="cursor-pointer py-3 font-bold">إعلان عام (معلومة)</SelectItem>
                            <SelectItem value="SUCCESS" className="cursor-pointer py-3 font-bold text-emerald-500">خبر سار (نجاح)</SelectItem>
                            <SelectItem value="WARNING" className="cursor-pointer py-3 font-bold text-amber-500">تنبيه (هام)</SelectItem>
                            <SelectItem value="ERROR" className="cursor-pointer py-3 font-bold text-red-500">تحذير (عاجل)</SelectItem>
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
                        <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">مستوى الأولوية</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            className="rounded-xl border-white/10 bg-white/5 h-12 text-center font-black"
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
                    <FormItem className="flex items-center justify-between rounded-xl border border-white/10 p-4 bg-white/5">
                      <div>
                        <FormLabel className="font-black text-xs">نشر فوري؟</FormLabel>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">تفعيل الظهور في لوحة المستخدمين</p>
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
                  <AdminButton type="submit" className="w-full h-14 text-md font-black shadow-xl rounded-2xl" icon={editingAnnouncement ? Edit : Send}>
                    {editingAnnouncement ? "تحديث الإعلان" : "نشر الإعلان الآن"}
                  </AdminButton>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      <AdminConfirm
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: null })}
        title="حذف الإعلان نهائياً؟"
        description="هل أنت متأكد من حذف هذا الإعلان من جميع السجلات؟ لا يمكن التراجع عن هذا الإجراء."
        confirmText="تأكيد الحذف"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
