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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { MoreHorizontal, Plus, Edit, Trash2, MessageSquare, Eye } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { TableSkeleton } from "@/components/admin/ui/loading-skeleton";
import { logger } from '@/lib/logger';

interface ForumCategory {
  id: string;
  name: string;
}

interface ForumPost {
  id: string;
  title: string;
  content: string;
  views: number;
  isPinned: boolean;
  isLocked: boolean;
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
    replies: number;
  };
}

const forumPostSchema = z.object({
  title: z.string().min(1, "عنوان الموضوع مطلوب"),
  content: z.string().min(1, "المحتوى مطلوب"),
  categoryId: z.string().optional(),
  isPinned: z.boolean(),
  isLocked: z.boolean(),
});

type ForumPostFormValues = z.infer<typeof forumPostSchema>;

export default function AdminForumPage() {
  const [posts, setPosts] = React.useState<ForumPost[]>([]);
  const [categories, setCategories] = React.useState<ForumCategory[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingPost, setEditingPost] = React.useState<ForumPost | null>(null);
  const [deleteDialog, setDeleteDialog] = React.useState<{
    open: boolean;
    id: string | null;
  }>({ open: false, id: null });

  const form = useForm<ForumPostFormValues>({
    resolver: zodResolver(forumPostSchema),
    defaultValues: {
      title: "",
      content: "",
      categoryId: "",
      isPinned: false,
      isLocked: false,
    },
  });

  const fetchPosts = React.useCallback(async () => {
    setLoading(true);
    try {
      const [postsRes, categoriesRes] = await Promise.all([
        fetch("/api/admin/forum"),
        fetch("/api/admin/forum-categories"),
      ]);

      if (!postsRes.ok || !categoriesRes.ok) {
        throw new Error("Failed to fetch forum data");
      }

      const postsData = await postsRes.json();
      const categoriesData = await categoriesRes.json();
      setPosts(postsData.posts || []);
      setCategories(categoriesData.categories || []);
    } catch (error) {
      logger.error("Error fetching forum posts:", error);
      toast.error("حدث خطأ أثناء جلب مواضيع المنتدى");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleOpenDialog = (post?: ForumPost) => {
    if (post) {
      setEditingPost(post);
      form.reset({
        title: post.title,
        content: post.content,
        categoryId: post.category?.id || "",
        isPinned: post.isPinned,
        isLocked: post.isLocked,
      });
    } else {
      setEditingPost(null);
      form.reset({
        title: "",
        content: "",
        categoryId: "",
        isPinned: false,
        isLocked: false,
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (values: ForumPostFormValues) => {
    try {
      const url = "/api/admin/forum";
      const method = editingPost ? "PATCH" : "POST";
      const body = editingPost ? { ...values, id: editingPost.id } : values;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(editingPost ? "تم تحديث الموضوع بنجاح" : "تم إنشاء الموضوع بنجاح");
        setDialogOpen(false);
        fetchPosts();
      } else {
        toast.error("حدث خطأ أثناء حفظ الموضوع");
      }
    } catch (error) {
      logger.error("Error saving forum post:", error);
      toast.error("حدث خطأ أثناء حفظ الموضوع");
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;

    try {
      const response = await fetch("/api/admin/forum", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteDialog.id }),
      });

      if (response.ok) {
        toast.success("تم حذف الموضوع بنجاح");
        fetchPosts();
      } else {
        toast.error("حدث خطأ أثناء حذف الموضوع");
      }
    } catch (error) {
      logger.error("Error deleting forum post:", error);
      toast.error("حدث خطأ أثناء حذف الموضوع");
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  const columns: ColumnDef<ForumPost>[] = [
    {
      accessorKey: "title",
      header: "الموضوع",
      cell: ({ row }) => {
        const post = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <MessageSquare className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{post.title}</p>
                {post.isPinned && (
                  <Badge variant="secondary" className="text-xs">مثبت</Badge>
                )}
                {post.isLocked && (
                  <Badge variant="outline" className="text-xs">مغلق</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                بواسطة {post.author.name || "مستخدم"}
              </p>
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
      accessorKey: "views",
      header: "المشاهدات",
      cell: ({ row }) => {
        const views = row.getValue("views") as number;
        return <span>{views}</span>;
      },
    },
    {
      id: "replies",
      header: "الردود",
      cell: ({ row }) => {
        const post = row.original;
        return <span>{post._count.replies}</span>;
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
        title="إدارة المنتدى"
        description="عرض وإدارة مواضيع المنتدى"
      >
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="ml-2 h-4 w-4" />
          إضافة موضوع
        </Button>
      </PageHeader>

      {loading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : (
        <DataTable
          columns={columns}
          data={posts}
          searchKey="title"
          searchPlaceholder="البحث عن موضوع..."
        />
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingPost ? "تعديل الموضوع" : "إضافة موضوع جديد"}
            </DialogTitle>
            <DialogDescription>
              أدخل بيانات الموضوع
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>عنوان الموضوع *</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Textarea {...field} rows={5} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>القسم</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر القسم" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
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
                  name="isPinned"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <FormLabel>مثبت</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isLocked"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <FormLabel>مغلق</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
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
        title="حذف الموضوع"
        description="هل أنت متأكد من حذف هذا الموضوع؟"
        confirmText="حذف"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
