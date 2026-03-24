"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminDataTable, RowActions } from "@/components/admin/ui/admin-table";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { AdminStatsCard } from "@/components/admin/ui/admin-card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle } from
"@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage } from
"@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Plus, Library, FileVideo,
  ScrollText, ExternalLink, Link, FileText, Video,
  File, Sparkles, Hammer, Trash2, Download, Zap, ShieldCheck, Database } from
"lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { TableSkeleton } from "@/components/admin/ui/loading-skeleton";
import { motion } from "framer-motion";

interface Subject {
  id: string;
  name: string;
  nameAr: string | null;
  color: string | null;
}

interface Resource {
  id: string;
  title: string;
  description: string | null;
  url: string;
  type: string;
  source: string | null;
  free: boolean;
  createdAt: string;
  subject: {
    id: string;
    name: string;
    nameAr: string | null;
    color: string | null;
  };
}

const resourceSchema = z.object({
  title: z.string().min(1, "عنوان المخطوطة مطلوب"),
  description: z.string().optional(),
  url: z.string().url("رابط البوابة غير صالح"),
  type: z.string().min(1, "نوع المصدر مطلوب"),
  source: z.string().optional(),
  free: z.boolean(),
  subjectId: z.string().min(1, "يجب تحديد العلم التابع له")
});

type ResourceFormValues = z.infer<typeof resourceSchema>;

const resourceTypes = [
{ value: "link", label: "بوابة خارجية", icon: Link, color: "blue" },
{ value: "video", label: "مخطوطة مرئية", icon: Video, color: "red" },
{ value: "pdf", label: "ببردية PDF", icon: FileText, color: "green" },
{ value: "document", label: "وثيقة علمية", icon: File, color: "purple" }];


export default function AdminResourcesPage() {
  const [resources, setResources] = React.useState<Resource[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingResource, setEditingResource] = React.useState<Resource | null>(null);
  const [deleteDialog, setDeleteDialog] = React.useState<{
    open: boolean;
    id: string | null;
  }>({ open: false, id: null });

  const form = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      title: "",
      description: "",
      url: "",
      type: "link",
      source: "",
      free: true,
      subjectId: ""
    }
  });

  const fetchResources = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/resources");
      const data = await response.json();
      setResources(data.resources || []);
    } catch (error) {
      console.error("Error fetching resources:", error);
      toast.error("حدث خطأ في استدعاء سجلات الأرشيف");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSubjects = React.useCallback(async () => {
    try {
      const response = await fetch("/api/admin/subjects?limit=100");
      const data = await response.json();
      setSubjects(data.subjects || []);
    } catch (error) {
      console.error("Error fetching subjects:", error);
    }
  }, []);

  React.useEffect(() => {
    fetchResources();
    fetchSubjects();
  }, [fetchResources, fetchSubjects]);

  const handleOpenDialog = (resource?: Resource) => {
    if (resource) {
      setEditingResource(resource);
      form.reset({
        title: resource.title,
        description: resource.description || "",
        url: resource.url,
        type: resource.type,
        source: resource.source || "",
        free: resource.free,
        subjectId: resource.subject.id
      });
    } else {
      setEditingResource(null);
      form.reset({
        title: "",
        description: "",
        url: "",
        type: "link",
        source: "",
        free: true,
        subjectId: ""
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (values: ResourceFormValues) => {
    try {
      const url = "/api/admin/resources";
      const method = editingResource ? "PATCH" : "POST";
      const body = editingResource ? { ...values, id: editingResource.id } : values;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        toast.success(editingResource ? "تم تحديث ميثاق المورد" : "تم حفظ مورد جديد في الأرشيف الإمبراطوري");
        setDialogOpen(false);
        fetchResources();
      } else {
        toast.error("فشل في تدوين المورد");
      }
    } catch (error) {
      console.error("Error saving resource:", error);
      toast.error("خطأ في الاتصال بالأرشيف");
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;

    try {
      const response = await fetch("/api/admin/resources", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteDialog.id })
      });

      if (response.ok) {
        toast.success("تم مسح المورد من السجلات");
        fetchResources();
      } else {
        toast.error("فشل في الإتلاف");
      }
    } catch (error) {
      console.error("Error deleting resource:", error);
      toast.error("خطأ في الاتصال");
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  const columns: ColumnDef<Resource>[] = [
  {
    accessorKey: "title",
    header: "المورد / المخطوطة",
    cell: ({ row }) => {
      const resource = row.original;
      const typeInfo = resourceTypes.find((t) => t.value === resource.type);
      const Icon = typeInfo?.icon || Link;
      return (
        <div className="flex items-center gap-4">
            <div
            className="flex h-12 w-12 items-center justify-center rounded-[1rem] border border-white/10 shadow-sm transition-transform hover:scale-105"
            style={{ backgroundColor: `${resource.subject.color || "#3b82f6"}20`, color: resource.subject.color || "#3b82f6" }}>
            
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <p className="font-black text-sm tracking-tight">{resource.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">
                  {resource.source || "إدارة الإمبراطورية"}
                </span>
                <Badge variant="outline" className="text-[8px] h-3 px-1 border-white/5 bg-white/5">
                  {resource.type}
                </Badge>
              </div>
            </div>
          </div>);

    }
  },
  {
    accessorKey: "subject",
    header: "العلم التابع له",
    cell: ({ row }) => {
      const resource = row.original;
      return (
        <Badge
          variant="outline"
          className="font-black text-[10px] border-2 px-3 py-1 bg-white/5 opacity-80"
          style={{ borderColor: `${resource.subject.color || "#3b82f6"}40`, color: resource.subject.color || "#3b82f6" }}>
          
            {resource.subject.nameAr || resource.subject.name}
          </Badge>);

    }
  },
  {
    accessorKey: "free",
    header: "رتبة الوصول",
    cell: ({ row }) => {
      const free = row.getValue("free") as boolean;
      return (
        <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${free ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"}`} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${free ? "text-emerald-500" : "text-amber-500"}`}>
              {free ? "متاح للعامة" : "للحاصلين على التصريح"}
            </span>
          </div>);

    }
  },
  {
    accessorKey: "createdAt",
    header: "تاريخ الأرشفة",
    cell: ({ row }) =>
    <span className="text-xs font-bold text-muted-foreground">
          {new Date(row.original.createdAt).toLocaleDateString("ar-EG")}
        </span>

  },
  {
    id: "actions",
    header: "التحكم الملكي",
    cell: ({ row }) =>
    <RowActions
      row={row.original}
      onEdit={handleOpenDialog}
      onDelete={(r) => setDeleteDialog({ open: true, id: r.id })}
      extraActions={[
      {
        icon: ExternalLink,
        label: "فتح البوابة",
        onClick: (r) => window.open(r.url, "_blank")
      }]
      } />


  }];


  return (
    <div className="space-y-10 pb-20" dir="rtl">
      <PageHeader
        title="أرشيف الموارد الإمبراطوري 📚"
        description="إدارة المكتبة المركزية، المخطوطات العلمية، وبوابات التعلم الخارجية لجيش المحاربين.">
        
        <div className="flex items-center gap-3">
          <AdminButton variant="outline" icon={Download}>تصدير الأرشيف</AdminButton>
          <AdminButton icon={Plus} onClick={() => handleOpenDialog()}>إضافة مورد جديد</AdminButton>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <AdminStatsCard
          title="إجمالي المخطوطات"
          value={resources.length}
          icon={Library}
          color="blue"
          description="مورد مؤرشف حالياً" />
        
        <AdminStatsCard
          title="بوابات مرئية"
          value={resources.filter((r) => r.type === "video").length}
          icon={FileVideo}
          color="red"
          description="دروس فيديو خارجية" />
        
        <AdminStatsCard
          title="برديات PDF"
          value={resources.filter((r) => r.type === "pdf").length}
          icon={ScrollText}
          color="green"
          description="ملفات دراسية محملة" />
        
        <AdminStatsCard
          title="موارد مجانية"
          value={resources.filter((r) => r.free).length}
          icon={Zap}
          color="yellow"
          description="متاحة لكافة المحاربين" />
        
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rpg-glass-light dark:rpg-glass p-1 rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
        
        {loading ?
        <TableSkeleton rows={8} cols={5} /> :

        <AdminDataTable
          columns={columns}
          data={resources}
          searchKey="title"
          searchPlaceholder="ابحث في رفوف الأرشيف..."
          actions={{ onRefresh: () => fetchResources() }}
          bulkActions={[
          {
            label: "إتلاف السجلات المحددة",
            icon: Trash2,
            variant: "destructive",
            onClick: async (rows) => {
              const ids = rows.map((r) => r.id);
              if (confirm(`هل أنت متأكد من مسح ${ids.length} مورد من التاريخ؟`)) {
                try {
                  const res = await fetch("/api/admin/resources", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ids })
                  });
                  if (res.ok) {
                    toast.success("تم تنظيف الأرشيف بنجاح");
                    fetchResources();
                  }
                } catch (_err) {
                  toast.error("فشل في عملية التطهير");
                }
              }
            }
          },
          {
            label: "إتاحة للعامة (مجاني)",
            icon: ShieldCheck,
            onClick: async (rows) => {
              const ids = rows.map((r) => r.id);
              try {
                const res = await fetch("/api/admin/resources", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ids, free: true })
                });
                if (res.ok) {
                  toast.success("تم فتح بوابات الوصول");
                  fetchResources();
                }
              } catch (_err) {
                toast.error("حدث خطأ في تحديث ميثاق الوصول");
              }
            }
          }]
          } />

        }
      </motion.div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg bg-card/80 backdrop-blur-xl border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
          <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
          <div className="p-8">
            <DialogHeader className="mb-8">
              <DialogTitle className="text-2xl font-black flex items-center gap-3">
                {editingResource ?
                <>
                    <Hammer className="w-7 h-7 text-indigo-500" />
                    تنقيح بيانات المخطوطة
                  </> :

                <>
                    <Database className="w-7 h-7 text-blue-500" />
                    أرشفة مورد جديد
                  </>
                }
              </DialogTitle>
              <DialogDescription className="font-bold text-muted-foreground">
                أدخل بيانات المورد بدقة لتسهيل وصول المحاربين إلى شعلة المعرفة.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) =>
                  <FormItem>
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">عنوان المورد</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="كتاب الملحمة الكبرى..." className="rounded-xl border-white/10 bg-white/5 h-12 px-6 font-bold" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  } />
                

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="subjectId"
                    render={({ field }) =>
                    <FormItem>
                        <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">العلم التابع له</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="rounded-xl border-white/10 bg-white/5 h-12">
                              <SelectValue placeholder="اختر المادة" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl border-white/10">
                            {subjects.map((subject) =>
                          <SelectItem key={subject.id} value={subject.id} className="font-bold cursor-pointer">
                                {subject.nameAr || subject.name}
                              </SelectItem>
                          )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    } />
                  

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) =>
                    <FormItem>
                        <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">صنف المورد</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="rounded-xl border-white/10 bg-white/5 h-12">
                              <SelectValue placeholder="اختر النوع" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl border-white/10">
                            {resourceTypes.map((type) =>
                          <SelectItem key={type.value} value={type.value} className="font-bold cursor-pointer">
                                <div className="flex items-center gap-2">
                                  <type.icon className={`w-3.5 h-3.5 text-${type.color}-500`} />
                                  <span>{type.label}</span>
                                </div>
                              </SelectItem>
                          )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    } />
                  
                </div>

                <FormField
                  control={form.control}
                  name="url"
                  render={({ field }) =>
                  <FormItem>
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">رابط البوابة (URL)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                          <Input {...field} type="url" dir="ltr" className="rounded-xl border-white/10 bg-white/5 h-12 pl-10 pr-6 font-mono text-xs" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  } />
                

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="source"
                    render={({ field }) =>
                    <FormItem>
                        <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">جهة الإصدار</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="إدارة Thanawy..." className="rounded-xl border-white/10 bg-white/5 h-11 px-4 font-bold" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    } />
                  

                  <FormField
                    control={form.control}
                    name="free"
                    render={({ field }) =>
                    <FormItem className="flex items-center justify-between rounded-xl border border-white/10 p-3 bg-white/5">
                        <div className="space-y-0.5">
                          <FormLabel className="font-black text-[10px] uppercase tracking-widest">إتاحة للعامة؟</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange} />
                        
                        </FormControl>
                      </FormItem>
                    } />
                  
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) =>
                  <FormItem>
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">حاشية مختصرة (وصف)</FormLabel>
                      <FormControl>
                        <Textarea {...field} className="rounded-2xl border-white/10 bg-white/5 p-4 min-h-[80px]" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  } />
                

                <DialogFooter className="pt-4">
                  <AdminButton type="submit" icon={editingResource ? Sparkles : Plus} className="w-full h-14 text-md font-black shadow-xl rounded-2xl">
                    {editingResource ? "تحديث السجل" : "أرشفة المخطوطة"}
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
        title="إتلاف المورد نهائياً؟"
        description="أنت على وشك حرق سجلات هذه المخطوطة من الأرشيف تماماً. هل أنت متأكد؟"
        confirmText="نعم، أتلف السجل"
        variant="destructive"
        onConfirm={handleDelete} />
      
    </div>);

}