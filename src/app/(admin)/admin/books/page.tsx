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
import { MoreHorizontal, Plus, Edit, Trash2, Download, Eye, FileText } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { TableSkeleton } from "@/components/admin/ui/loading-skeleton";

interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  coverUrl: string | null;
  downloadUrl: string;
  rating: number;
  views: number;
  downloads: number;
  tags: string[];
  createdAt: string;
  subject: {
    id: string;
    name: string;
    nameAr: string | null;
  };
}

interface Subject {
  id: string;
  name: string;
  nameAr: string | null;
}

const bookSchema = z.object({
  title: z.string().min(1, "عنوان الكتاب مطلوب"),
  author: z.string().min(1, "اسم المؤلف مطلوب"),
  description: z.string().optional(),
  subjectId: z.string().min(1, "المادة مطلوبة"),
  coverUrl: z.string().optional(),
  downloadUrl: z.string().min(1, "رابط التحميل مطلوب"),
  tags: z.array(z.string()).optional(),
});

type BookFormValues = z.infer<typeof bookSchema>;

export default function AdminBooksPage() {
  const [books, setBooks] = React.useState<Book[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingBook, setEditingBook] = React.useState<Book | null>(null);
  const [deleteDialog, setDeleteDialog] = React.useState<{
    open: boolean;
    id: string | null;
  }>({ open: false, id: null });

  const form = useForm<BookFormValues>({
    resolver: zodResolver(bookSchema),
    defaultValues: {
      title: "",
      author: "",
      description: "",
      subjectId: "",
      coverUrl: "",
      downloadUrl: "",
      tags: [],
    },
  });

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [booksRes, subjectsRes] = await Promise.all([
        fetch("/api/admin/books"),
        fetch("/api/admin/subjects?limit=100"),
      ]);
      const booksData = await booksRes.json();
      const subjectsData = await subjectsRes.json();
      setBooks(booksData.books);
      setSubjects(subjectsData.subjects);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("حدث خطأ أثناء جلب البيانات");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenDialog = (book?: Book) => {
    if (book) {
      setEditingBook(book);
      form.reset({
        title: book.title,
        author: book.author,
        description: book.description || "",
        subjectId: book.subject.id,
        coverUrl: book.coverUrl || "",
        downloadUrl: book.downloadUrl,
        tags: book.tags,
      });
    } else {
      setEditingBook(null);
      form.reset({
        title: "",
        author: "",
        description: "",
        subjectId: "",
        coverUrl: "",
        downloadUrl: "",
        tags: [],
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (values: BookFormValues) => {
    try {
      const url = "/api/admin/books";
      const method = editingBook ? "PATCH" : "POST";
      const body = editingBook ? { ...values, id: editingBook.id } : values;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(editingBook ? "تم تحديث الكتاب بنجاح" : "تم إنشاء الكتاب بنجاح");
        setDialogOpen(false);
        fetchData();
      } else {
        toast.error("حدث خطأ أثناء حفظ الكتاب");
      }
    } catch (error) {
      console.error("Error saving book:", error);
      toast.error("حدث خطأ أثناء حفظ الكتاب");
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;

    try {
      const response = await fetch("/api/admin/books", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteDialog.id }),
      });

      if (response.ok) {
        toast.success("تم حذف الكتاب بنجاح");
        fetchData();
      } else {
        toast.error("حدث خطأ أثناء حذف الكتاب");
      }
    } catch (error) {
      console.error("Error deleting book:", error);
      toast.error("حدث خطأ أثناء حذف الكتاب");
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  const columns: ColumnDef<Book>[] = [
    {
      accessorKey: "title",
      header: "الكتاب",
      cell: ({ row }) => {
        const book = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{book.title}</p>
              <p className="text-sm text-muted-foreground">{book.author}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "subject",
      header: "المادة",
      cell: ({ row }) => {
        const book = row.original;
        return (
          <Badge variant="outline">
            {book.subject.nameAr || book.subject.name}
          </Badge>
        );
      },
    },
    {
      accessorKey: "rating",
      header: "التقييم",
      cell: ({ row }) => {
        const rating = row.getValue("rating") as number;
        return <span>{rating.toFixed(1)} ⭐</span>;
      },
    },
    {
      accessorKey: "downloads",
      header: "التحميلات",
      cell: ({ row }) => {
        const downloads = row.getValue("downloads") as number;
        return <span>{downloads.toLocaleString()}</span>;
      },
    },
    {
      accessorKey: "views",
      header: "المشاهدات",
      cell: ({ row }) => {
        const views = row.getValue("views") as number;
        return <span>{views.toLocaleString()}</span>;
      },
    },
    {
      accessorKey: "createdAt",
      header: "تاريخ الإضافة",
      cell: ({ row }) => {
        const date = row.getValue("createdAt") as string;
        return new Date(date).toLocaleDateString("ar-EG");
      },
    },
    {
      id: "actions",
      header: "الإجراءات",
      cell: ({ row }) => {
        const book = row.original;
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
              <DropdownMenuItem onClick={() => window.open(book.downloadUrl, "_blank")}>
                <Download className="ml-2 h-4 w-4" />
                تحميل
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOpenDialog(book)}>
                <Edit className="ml-2 h-4 w-4" />
                تعديل
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setDeleteDialog({ open: true, id: book.id })}
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
        title="إدارة الكتب"
        description="عرض وإدارة جميع الكتب المتاحة في الموقع"
      >
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="ml-2 h-4 w-4" />
          إضافة كتاب
        </Button>
      </PageHeader>

      {loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : (
        <DataTable
          columns={columns}
          data={books}
          searchKey="title"
          searchPlaceholder="البحث عن كتاب..."
        />
      )}

      {/* Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة كتاب جديد</DialogTitle>
            <DialogDescription>
              أدخل بيانات الكتاب
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>عنوان الكتاب *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="author"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المؤلف *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subjectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المادة *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر المادة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الوصف</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="downloadUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رابط التحميل *</FormLabel>
                    <FormControl>
                      <Input {...field} type="url" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="coverUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رابط الغلاف</FormLabel>
                    <FormControl>
                      <Input {...field} type="url" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit">
                  {editingBook ? "تحديث" : "إنشاء"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: null })}
        title="حذف الكتاب"
        description="هل أنت متأكد من حذف هذا الكتاب؟"
        confirmText="حذف"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
