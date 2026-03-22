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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  MoreHorizontal,
  Plus,
  Edit,
  Trash2,
  Eye,
  FileText,
  User,
  Calendar,
  Globe,
  Lock,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { TableSkeleton } from "@/components/admin/ui/loading-skeleton";

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

const blogPostSchema = z.object({
  title: z.string().min(1, "عنوان المقال مطلوب"),
  slug: z.string().min(1, "الرابط مطلوب"),
  content: z.string().min(1, "المحتوى مطلوب"),
  excerpt: z.string().optional(),
  isPublished: z.boolean(),
});

type BlogPostFormValues = z.infer<typeof blogPostSchema>;

export default function AdminBlogPage() {
  const [posts, setPosts] = React.useState<BlogPost[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingPost, setEditingPost] = React.useState<BlogPost | null>(null);
  const [deleteDialog, setDeleteDialog] = React.useState<{
    open: boolean;
    id: string | null;
  }>({ open: false, id: null });

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

  const fetchPosts = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/blog");
      const data = await response.json();
      setPosts(data.posts || []);
    } catch (error) {
      console.error("Error fetching blog posts:", error);
      toast.error("حدث خطأ أثناء جلب المقالات");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

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
      const url = "/api/admin/blog";
      const method = editingPost ? "PATCH" : "POST";
      const body = editingPost ? { ...values, id: editingPost.id } : values;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(editingPost ? "تم تحديث المقال بنجاح" : "تم إنشاء المقال بنجاح");
        setDialogOpen(false);
        fetchPosts();
      } else {
        toast.error("حدث خطأ أثناء حفظ المقال");
      }
    } catch (error) {
      console.error("Error saving blog post:", error);
      toast.error("حدث خطأ أثناء حفظ المقال");
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
        toast.success("تم حذف المقال بنجاح");
        fetchPosts();
      } else {
        toast.error("حدث خطأ أثناء حذف المقال");
      }
    } catch (error) {
      console.error("Error deleting blog post:", error);
      toast.error("حدث خطأ أثناء حذف المقال");
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  const columns: ColumnDef<BlogPost>[] = [
    {
      accessorKey: "title",
      header: "المقال",
      cell: ({ row }) => {
        const post = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <FileText className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="font-medium">{post.title}</p>
              <p className="text-sm text-muted-foreground">{post.slug}</p>
            </div>
          </div>
        );
      },
    },
    {
      id: "category",
      header: "القسم",
      cell: ({ row }) => {
        const post = row.original;
        return post.category ? (
          <Badge variant="outline">{post.category.name}</Badge>
        ) : "-";
      },
    },
    {
      accessorKey: "isPublished",
      header: "الحالة",
      cell: ({ row }) => {
        const isPublished = row.getValue("isPublished") as boolean;
        return (
          <Badge variant={isPublished ? "default" : "secondary"}>
            {isPublished ? "منشور" : "مسودة"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "views",
      header: "المشاهدات",
      cell: ({ row }) => {
        const views = row.getValue("views") as number;
        return <span>{views}</span>;
      },
    },
    {
      accessorKey: "createdAt",
      header: "تاريخ النشر",
      cell: ({ row }) => {
        const date = row.getValue("createdAt") as string;
        return new Date(date).toLocaleDateString("ar-EG");
      },
    },
    {
      id: "actions",
      header: "الإجراءات",
      cell: ({ row }) => {
        const post = row.original;
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
              <DropdownMenuItem>
                <Eye className="ml-2 h-4 w-4" />
                عرض
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOpenDialog(post)}>
                <Edit className="ml-2 h-4 w-4" />
                تعديل
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setDeleteDialog({ open: true, id: post.id })}
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="إدارة المدونة"
        description="عرض وإدارة مقالات المدونة"
      >
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="ml-2 h-4 w-4" />
          إضافة مقال
        </Button>
      </PageHeader>

      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : (
        <DataTable
          columns={columns}
          data={posts}
          searchKey="title"
          searchPlaceholder="البحث عن مقال..."
        />
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingPost ? "تعديل المقال" : "إضافة مقال جديد"}
            </DialogTitle>
            <DialogDescription>
              أدخل بيانات المقال
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>عنوان المقال *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الرابط *</FormLabel>
                      <FormControl>
                        <Input {...field} dir="ltr" placeholder="article-title" />
                      </FormControl>
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
                    <FormLabel>ملخص</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المحتوى *</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={8} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isPublished"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <FormLabel>منشور</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit">
                  {editingPost ? "تحديث" : "إنشاء"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: null })}
        title="حذف المقال"
        description="هل أنت متأكد من حذف هذا المقال؟"
        confirmText="حذف"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
