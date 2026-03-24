"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminDataTable, RowActions } from "@/components/admin/ui/admin-table";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { AdminCard } from "@/components/admin/ui/admin-card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, Eye, FileText, Calendar, Globe, 
  Lock, BookOpen, MessageSquare, TrendingUp, Hash, ArrowUpRight, Search
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
import { useQuery } from "@tanstack/react-query";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  views: number;
  isPublished: boolean;
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
  title: z.string().min(1, "عنوان المخطوطة مطلوب"),
  slug: z.string().min(1, "رمز الاستدعاء (Slug) مطلوب"),
  content: z.string().min(1, "متن المخطوطة مطلوب"),
  excerpt: z.string().optional(),
  isPublished: z.boolean(),
});

type BlogPostFormValues = z.infer<typeof blogPostSchema>;

export default function AdminBlogPage() {
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

      const response = await fetch(`/api/admin/blog?${params.toString()}`);
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
      isPublished: false,
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
        isPublished: post.isPublished,
      });
    } else {
      setEditingPost(null);
      form.reset({
        title: "",
        slug: "",
        content: "",
        excerpt: "",
        isPublished: false,
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (values: BlogPostFormValues) => {
    try {
      const method = editingPost ? "PATCH" : "POST";
      const body = editingPost ? { ...values, id: editingPost.id } : values;
      const response = await fetch("/api/admin/blog", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(editingPost ? "تم تحديث المخطوطة" : "تم حفظ المخطوطة في المكتبة الملكية");
        setDialogOpen(false);
        refetch();
      } else {
        toast.error("فشل في حفظ المخطوطة");
      }
    } catch (_error) {
      toast.error("خطأ في الاتصال");
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;
    try {
      const response = await fetch("/api/admin/blog", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteDialog.id }),
      });

      if (response.ok) {
        toast.success("تم إتلاف المخطوطة بنجاح");
        refetch();
      } else {
        toast.error("فشل في الإتلاف");
      }
    } catch (_error) {
      toast.error("خطأ في الاتصال");
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  const columns: ColumnDef<BlogPost>[] = [
    {
      accessorKey: "title",
      header: "المخطوطة (المقال)",
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
      header: "إحصائيات القراء",
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
      accessorKey: "isPublished",
      header: "حالة النشر",
      cell: ({ row }) => {
        const published = row.original.isPublished;
        return (
          <Badge 
            variant="outline" 
            className={`font-black text-[10px] uppercase tracking-widest rounded-lg border-2 px-3 py-1 ${
              published 
                ? "bg-emerald-500/5 text-emerald-500 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]" 
                : "bg-amber-500/5 text-amber-500 border-amber-500/20"
            }`}
          >
            {published ? "منشور للعامة" : "مسودة خاصة"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "تاريخ التدوين",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="w-3.5 h-3.5" />
          <span className="text-xs font-black">{new Date(row.original.createdAt).toLocaleDateString("ar-EG")}</span>
        </div>
      ),
    },
    {
      id: "actions",
      header: "التحكم بالعلم",
      cell: ({ row }) => (
        <RowActions
          row={row.original}
          onEdit={handleOpenDialog}
          onDelete={(p) => setDeleteDialog({ open: true, id: p.id })}
          extraActions={[
            { icon: ArrowUpRight, label: "معاينة في المدونة", onClick: (p) => window.open(`/blog/${p.slug}`, "_blank") },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-10 pb-20" dir="rtl">
      <PageHeader
        title="مكتبة المخطوطات الملكية (Blog) 📚"
        description="دون المعرفة، شارك القصص، والهم المحاربين بمقالاتك الفريدة في أرجاء المملكة."
      >
        <AdminButton icon={Plus} onClick={() => handleOpenDialog()}>
          تدوين مخطوطة جديدة
        </AdminButton>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "إجمالي المخطوطات", value: posts.length, icon: BookOpen, color: "blue" },
          { label: "مخطوطات منشورة", value: posts.filter(p => p.isPublished).length, icon: Globe, color: "emerald" },
          { label: "إجمالي القراءات", value: posts.reduce((acc, p) => acc + p.views, 0), icon: TrendingUp, color: "purple" },
          { label: "مسودات قيد العمل", value: posts.filter(p => !p.isPublished).length, icon: Lock, color: "amber" },
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
        totalRows={pagination?.total || 0}
        pageCount={pagination?.totalPages || 1}
        currentPage={page}
        onPageChange={setPage}
        onPageSizeChange={setLimit}
        pageSize={limit}
        actions={{ onRefresh: () => refetch() }}
        toolbar={
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="???? ?? ????? ???????"
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
                {editingPost ? "تنقيح المخطوطة" : "تدوين علم جديد"}
              </DialogTitle>
              <DialogDescription className="font-bold text-muted-foreground">
                اكتب كلماتك بدقة، فالمعرفة هي أعظم سلاح في مملكتنا.
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
                        <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">عنوان المخطوطة</FormLabel>
                        <FormControl><Input {...field} placeholder="أسرار المحارب القديم..." className="rounded-2xl border-white/10 bg-white/5 h-12 px-6 font-bold" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">رمز الاستدعاء (Slug)</FormLabel>
                        <FormControl><Input {...field} dir="ltr" placeholder="secrets-of-warrior" className="rounded-2xl border-white/10 bg-white/5 h-12 px-6 font-bold" /></FormControl>
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
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">موجز قصير (الملخص)</FormLabel>
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
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">متن العلم (المحتوى)</FormLabel>
                      <FormControl><Textarea {...field} rows={10} className="rounded-2xl border-white/10 bg-white/5 p-6 font-medium leading-relaxed" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isPublished"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-2xl border border-white/10 p-4 bg-white/5">
                      <div>
                        <FormLabel className="font-black text-xs">نشر للعامة؟</FormLabel>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">تفعيل الظهور في مكتبة المملكة الآن</p>
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
                    {editingPost ? "تحديث المخطوطة" : "حفظ في المكتبة"}
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
        title="إتلاف المخطوطة؟"
        description="هل أنت متأكد من حرق هذه المخطوطة؟ لن يتمكن أي باحث عن العلم من قراءتها مجدداً."
        confirmText="نعم، احرقها"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
