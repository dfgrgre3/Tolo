"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminDataTable, RowActions } from "@/components/admin/ui/admin-table";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { AdminCard } from "@/components/admin/ui/admin-card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, Eye, FileText, Calendar, Globe, 
  Lock, BookOpen, MessageSquare, TrendingUp, Hash, ArrowUpRight, Search, Edit, Trash2,
  Send, Download, EyeOff
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { readApiErrorMessage } from "@/lib/api/api-error-utils";
import { adminFetch } from "@/lib/api/admin-api";
import { requestPublicCacheRevalidation } from "@/lib/public-cache/revalidate-public";
import { apiRoutes } from "@/lib/api/routes";
import { usePermission } from "@/components/auth/PermissionGuard";
import { MarkdownEditor } from "@/components/admin/ui/markdown-editor";
import { AdminUpload } from "@/components/admin/ui/admin-upload";
import { logAdminAction } from "@/lib/admin-audit";
import { exportToCSV, ExportColumn } from '@/lib/export-utils';
import { PERMISSIONS } from "@/lib/permissions";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  views: number;
  status: "DRAFT" | "PUBLISHED" | "SCHEDULED";
  publishAt: string | null;
  createdAt: string;
  author: {
    id: string;
    name: string | null;
    avatar: string | null;
  };
  category: {
    id: string;
    name: string;
  } | null;
  _count: {
    comments: number;
  };
}

const isPublished = (status: string) => status === "PUBLISHED";
const isScheduled = (status: string) => status === "SCHEDULED";

interface BlogPostsResponse {
  data: {
    posts: BlogPost[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

const blogPostSchema = z.object({
  title: z.string().min(1, "عنوان المقال مطلوب"),
  slug: z.string().min(1, "الرابط المختصر (Slug) مطلوب"),
  content: z.string().min(1, "محتوى المقال مطلوب"),
  excerpt: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "SCHEDULED"]),
  publishAt: z.string().optional().or(z.literal("")),
});

type BlogPostFormValues = z.infer<typeof blogPostSchema>;

export default function AdminBlogPage() {
  const { hasPermission } = usePermission();
  const canManageBlog = hasPermission(PERMISSIONS.BLOG_MANAGE);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingPost, setEditingPost] = React.useState<BlogPost | null>(null);
  const [deleteDialog, setDeleteDialog] = React.useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);
  const [search, setSearch] = React.useState("");
  const deferredSearch = React.useDeferredValue(search);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "blog-posts", page, limit, deferredSearch],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (deferredSearch) {
        params.set("search", deferredSearch);
      }

      const response = await adminFetch(`${apiRoutes.admin.blog}?${params.toString()}`);
      return (await response.json()) as BlogPostsResponse;
    },
  });

  const posts = data?.data?.posts || [];
  const pagination = data?.data?.pagination;

  React.useEffect(() => {
    setPage(1);
  }, [deferredSearch]);

  const form = useForm<BlogPostFormValues>({
    resolver: zodResolver(blogPostSchema),
    defaultValues: {
      title: "",
      slug: "",
      content: "",
      excerpt: "",
      status: "DRAFT" as const,
      publishAt: "",
    },
  });

  const handleOpenDialog = (post?: BlogPost) => {
    if (post) {
      setEditingPost(post);
      form.reset({
        title: post.title,
        slug: post.slug,
        content: post.content,
        excerpt: post.excerpt || "",
        status: post.status,
        publishAt: post.publishAt ? new Date(post.publishAt).toISOString().slice(0, 16) : "",
      });
    } else {
      setEditingPost(null);
      form.reset({
        title: "",
        slug: "",
        content: "",
        excerpt: "",
        status: "DRAFT" as const,
        publishAt: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (values: BlogPostFormValues) => {
    try {
      const method = editingPost ? "PATCH" : "POST";
      const body = editingPost ? { ...values, id: editingPost.id } : values;
      const response = await adminFetch(apiRoutes.admin.blog, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(editingPost ? "تم تحديث المقال بنجاح" : "تم حفظ المقال في المدونة بنجاح");
        
        logAdminAction(
          editingPost ? "UPDATE" : "CREATE",
          "blog",
          {
            entityId: editingPost?.id || result?.data?.id,
            entityName: values.title,
            details: { status: values.status },
          }
        );

        setDialogOpen(false);
        refetch();
        const paths = ["/blog"];
        if (values.slug) paths.push(`/blog/${encodeURIComponent(values.slug)}`);
        void requestPublicCacheRevalidation(paths).catch(() => {
          /* ISR اختياري — لا نقطع تجربة الأدمن */
        });
      } else {
        const errBody = await response.json().catch(() => ({}));
        toast.error(readApiErrorMessage(errBody, "فشل في حفظ المقال"));
      }
    } catch (_error) {
      toast.error("خطأ في الاتصال");
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;
    try {
      const postToDelete = posts.find(p => p.id === deleteDialog.id);
      const response = await adminFetch(apiRoutes.admin.blog, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteDialog.id }),
      });

      if (response.ok) {
        toast.success("تم حذف المقال بنجاح");
        
        logAdminAction("DELETE", "blog", {
          entityId: deleteDialog.id,
          entityName: postToDelete?.title,
        });

        refetch();
        void requestPublicCacheRevalidation(["/blog"]).catch(() => {});
      } else {
        const errBody = await response.json().catch(() => ({}));
        toast.error(readApiErrorMessage(errBody, "فشل في حذف المقال"));
      }
    } catch (_error) {
      toast.error("خطأ في الاتصال");
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  const columns: ColumnDef<BlogPost>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="تحديد الكل"
          className="translate-y-[2px] border-white/20"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="تحديد الصف"
          className="translate-y-[2px] border-white/20"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "title",
      header: "المقال",
      cell: ({ row }) => {
        const post = row.original;
        return (
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-sm border border-primary/10">
              <FileText className="w-5 h-5" />
            </div>
            <div className="max-w-[300px]">
              <p className="font-black text-sm tracking-tight">{post.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Hash className="w-3 h-3 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">
                  {post.slug}
                </p>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      id: "stats",
      header: "الإحصائيات",
      cell: ({ row }) => {
        const post = row.original;
        return (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-[11px] font-black">{post.views}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-purple-500" />
              <span className="text-[11px] font-black">{post._count?.comments || 0}</span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "حالة النشر",
      cell: ({ row }) => {
        const published = isPublished(row.original.status);
        return (
          <Badge 
            variant="outline" 
            className={`font-black text-[10px] uppercase tracking-widest rounded-lg border-2 px-3 py-1 ${
              published 
                ? "bg-emerald-500/5 text-emerald-500 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]" 
                : "bg-amber-500/5 text-amber-500 border-amber-500/20"
            }`}
          >
            {published ? "منشور" : "مسودة"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "تاريخ النشر",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="w-3.5 h-3.5" />
          <span className="text-xs font-black">{new Date(row.original.createdAt).toLocaleDateString("ar-EG")}</span>
        </div>
      ),
    },
    {
      id: "actions",
      header: "الإجراءات",
      cell: ({ row }) => (
        <RowActions
          row={row.original}
          onEdit={canManageBlog ? handleOpenDialog : undefined}
          onDelete={canManageBlog ? (p) => setDeleteDialog({ open: true, id: p.id }) : undefined}
          extraActions={[
            { icon: ArrowUpRight, label: "معاينة المقال", onClick: (p) => window.open(`/blog/${p.slug}`, "_blank") },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-10 pb-20" dir="rtl">
      <PageHeader
        title="إدارة المدونة التعليمية 📚"
        description="إدارة المقالات، الأخبار، والمحتوى التعليمي للمنصة."
      >
        {canManageBlog && (
          <AdminButton icon={Plus} onClick={() => handleOpenDialog()}>
            إضافة مقال جديد
          </AdminButton>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "إجمالي المقالات", value: posts.length, icon: BookOpen, color: "blue" },
          { label: "مقالات منشورة", value: posts.filter(p => isPublished(p.status)).length, icon: Globe, color: "emerald" },
          { label: "إجمالي المشاهدات", value: posts.reduce((acc, p) => acc + p.views, 0), icon: TrendingUp, color: "purple" },
          { label: "مسودات", value: posts.filter(p => !isPublished(p.status)).length, icon: Lock, color: "amber" },
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
        data={posts}
        loading={isLoading}
        serverSide
        selectable
        totalRows={pagination?.total || 0}
        pageCount={pagination?.totalPages || 1}
        currentPage={page}
        onPageChange={setPage}
        onPageSizeChange={setLimit}
        pageSize={limit}
        bulkActions={[
          {
            label: "نشر المحدد",
            icon: Globe,
            onClick: async (rows) => {
              const ids = rows.map((r: BlogPost) => r.id);
              const response = await adminFetch(apiRoutes.admin.blog, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids, status: "PUBLISHED" }),
              });
              if (response.ok) {
                toast.success(`تم نشر ${ids.length} مقال`);
                logAdminAction("PUBLISH", "blog", { details: { count: ids.length } });
                refetch();
                void requestPublicCacheRevalidation(["/blog"]).catch(() => {});
              } else {
                toast.error("فشل في نشر المقالات");
              }
            },
          },
          {
            label: "تحويل لمسودات",
            icon: EyeOff,
            onClick: async (rows) => {
              const ids = rows.map((r: BlogPost) => r.id);
              const response = await adminFetch(apiRoutes.admin.blog, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids, status: "DRAFT" }),
              });
              if (response.ok) {
                toast.success(`تم تحويل ${ids.length} مقال لمسودة`);
                logAdminAction("UNPUBLISH", "blog", { details: { count: ids.length } });
                refetch();
                void requestPublicCacheRevalidation(["/blog"]).catch(() => {});
              } else {
                toast.error("فشل في تحويل المقالات");
              }
            },
          },
          {
            label: "تصدير CSV",
            icon: Download,
            onClick: (rows) => {
              const exportColumns: ExportColumn<BlogPost>[] = [
                { header: 'العنوان', accessor: 'title' },
                { header: 'الرابط', accessor: 'slug' },
                { header: 'الحالة', accessor: (p) => p.status === 'PUBLISHED' ? 'منشور' : 'مسودة' },
                { header: 'المشاهدات', accessor: (p) => p.views },
                { header: 'التعليقات', accessor: (p) => p._count?.comments || 0 },
                { header: 'تاريخ النشر', accessor: (p) => new Date(p.createdAt).toLocaleDateString('ar-EG') },
              ];
              exportToCSV(rows, exportColumns, 'blog-posts');
              toast.success('تم تصدير المقالات بنجاح');
            },
          },
          {
            label: "حذف المحدد",
            icon: Trash2,
            variant: "destructive",
            onClick: async (rows) => {
              const ids = rows.map((r: BlogPost) => r.id);
              const response = await adminFetch(apiRoutes.admin.blog, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids }),
              });
              if (response.ok) {
                toast.success(`تم حذف ${ids.length} مقال`);
                logAdminAction("DELETE", "blog", { details: { count: ids.length } });
                refetch();
                void requestPublicCacheRevalidation(["/blog"]).catch(() => {});
              } else {
                toast.error("فشل في حذف المقالات");
              }
            },
          },
        ]}
        actions={{ onRefresh: () => refetch() }}
        toolbar={
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث عن مقال..."
              className="h-10 w-72 rounded-xl border border-border bg-accent/20 px-10 text-sm outline-none ring-primary transition focus:ring-1"
            />
          </div>
        }
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl bg-card/80 backdrop-blur-xl border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
          <div className="h-1.5 bg-gradient-to-r from-primary via-blue-500 to-purple-500" />
          <div className="p-8">
            <DialogHeader className="mb-8">
              <DialogTitle className="text-2xl font-black">
                {editingPost ? "تعديل المقال" : "إضافة مقال جديد"}
              </DialogTitle>
              <DialogDescription className="font-bold text-muted-foreground">
                قم بكتابة وتنسيق المقال التعليمي لنشره للطلاب.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">عنوان المقال</FormLabel>
                        <FormControl><Input {...field} placeholder="أسرار النجاح في..." className="rounded-2xl border-white/10 bg-white/5 h-12 px-6 font-bold" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">الرابط المختصر (Slug)</FormLabel>
                        <FormControl><Input {...field} dir="ltr" placeholder="article-slug-here" className="rounded-2xl border-white/10 bg-white/5 h-12 px-6 font-bold" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="excerpt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">ملخص المقال</FormLabel>
                      <FormControl><Textarea {...field} rows={2} className="rounded-2xl border-white/10 bg-white/5 p-4 font-medium" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">محتوى المقال</FormLabel>
                      <FormControl>
                        <MarkdownEditor
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="اكتب محتوى المقال هنا باستخدام Markdown..."
                          minHeight={350}
                          onImageUpload={async (file) => {
                            const formData = new FormData();
                            formData.append("file", file);
                            const response = await fetch("/api/upload", {
                              method: "POST",
                              body: formData,
                              credentials: "include",
                            });
                            if (!response.ok) throw new Error("فشل رفع الصورة");
                            const data = await response.json();
                            return data.fileUrl;
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-2xl border border-white/10 p-4 bg-white/5">
                      <div>
                        <FormLabel className="font-black text-xs">حالة النشر</FormLabel>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">تفعيل ظهور المقال في المدونة</p>
                      </div>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="w-40 rounded-xl border-white/10 bg-white/5 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-white/10">
                            <SelectItem value="PUBLISHED" className="cursor-pointer py-2 font-bold text-emerald-500">منشور الآن</SelectItem>
                            <SelectItem value="SCHEDULED" className="cursor-pointer py-2 font-bold text-blue-500">مجدول</SelectItem>
                            <SelectItem value="DRAFT" className="cursor-pointer py-2 font-bold text-amber-500">مسودة</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch("status") === "SCHEDULED" && (
                  <FormField
                    control={form.control}
                    name="publishAt"
                    render={({ field }) => (
                      <FormItem className="rounded-2xl border border-blue-500/20 p-4 bg-blue-500/5">
                        <FormLabel className="font-black text-xs text-blue-500 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          وقت النشر المجدول
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="datetime-local"
                            className="rounded-xl border-white/10 bg-white/5 h-12 px-6 font-bold"
                          />
                        </FormControl>
                        <p className="text-[10px] font-bold text-muted-foreground mt-1">
                          سيتم نشر المقال تلقائياً في الوقت المحدد
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <DialogFooter className="pt-4">
                  <AdminButton type="submit" className="w-full h-14 text-md font-black shadow-xl rounded-2xl">
                    {editingPost ? "تحديث المقال" : "حفظ المقال"}
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
        title="حذف المقال نهائياً؟"
        description="هل أنت متأكد من حذف هذا المقال؟ سيتم إزالته من السجلات ولن يتمكن الطلاب من قراءته مجدداً."
        confirmText="تأكيد الحذف"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
