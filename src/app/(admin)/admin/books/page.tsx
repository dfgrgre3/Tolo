"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminDataTable, RowActions } from "@/components/admin/ui/admin-table";
import { AdminButton, IconButton } from "@/components/admin/ui/admin-button";
import { AdminCard } from "@/components/admin/ui/admin-card";
import { 
  Plus, Edit, Trash2, BookOpen, Download, Upload, Star, 
  FileText, Search, Filter, Eye, List, Users, RefreshCw
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
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingBook, setEditingBook] = React.useState<Book | null>(null);
  const [deleteDialog, setDeleteDialog] = React.useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });

  const { data: books = [], isLoading, refetch } = useQuery({
    queryKey: ["admin", "books"],
    queryFn: async () => {
      const response = await fetch("/api/admin/books");
      const result = await response.json();
      return (result.books || []) as Book[];
    },
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ["admin", "subjects-list"],
    queryFn: async () => {
      const response = await fetch("/api/admin/subjects?limit=100");
      const result = await response.json();
      return (result.subjects || []) as Subject[];
    },
  });

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
      const method = editingBook ? "PATCH" : "POST";
      const body = editingBook ? { ...values, id: editingBook.id } : values;
      const response = await fetch("/api/admin/books", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(editingBook ? "تم تحديث المجلد الملكي" : "تم تدوين كتاب جديد بالمكتبة");
        setDialogOpen(false);
        refetch();
      } else {
        toast.error("فشل في حفظ الكتاب");
      }
    } catch (error) {
      toast.error("خطأ في الاتصال");
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
        toast.success("تم حرق المجلد من السجلات");
        refetch();
      } else {
        toast.error("فشل في الحذف");
      }
    } catch (error) {
      toast.error("خطأ في الاتصال");
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  const columns: ColumnDef<Book>[] = [
    {
      accessorKey: "title",
      header: "المجلد العلمي",
      cell: ({ row }) => {
        const book = row.original;
        return (
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative flex h-14 w-10 items-center justify-center rounded-sm bg-background border border-white/10 overflow-hidden shadow-2xl">
                {book.coverUrl ? (
                  <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                ) : (
                  <BookOpen className="h-5 w-5 text-amber-500" />
                )}
              </div>
            </div>
            <div>
              <p className="font-black text-sm tracking-tight">{book.title}</p>
              <p className="text-[10px] text-muted-foreground font-bold flex items-center gap-1">
                <Users className="w-3 h-3" />
                بواسطة: {book.author}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "subject",
      header: "المجال",
      cell: ({ row }) => (
        <Badge variant="outline" className="rounded-lg bg-white/5 border-white/10 text-muted-foreground font-black text-[10px] uppercase">
          {row.original.subject.nameAr || row.original.subject.name}
        </Badge>
      ),
    },
    {
      accessorKey: "stats",
      header: "إحصائيات القراءة",
      cell: ({ row }) => (
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
            <Star className="w-3.5 h-3.5 fill-current" />
            <span>{row.original.rating.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-500">
            <Download className="w-3.5 h-3.5" />
            <span>{row.original.downloads.toLocaleString()}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "تاريخ التدوين",
      cell: ({ row }) => (
        <span className="text-xs font-bold opacity-60">
          {new Date(row.original.createdAt).toLocaleDateString("ar-EG")}
        </span>
      ),
    },
    {
      id: "actions",
      header: "التحكم",
      cell: ({ row }) => (
        <RowActions
          row={row.original}
          onEdit={handleOpenDialog}
          onDelete={(b) => setDeleteDialog({ open: true, id: b.id })}
          extraActions={[
            { icon: Eye, label: "معاينة المجلد", onClick: (b) => window.open(b.downloadUrl, "_blank") },
            { icon: Download, label: "تحميل المخطوطة", onClick: (b) => window.open(b.downloadUrl, "_blank") },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-10 pb-20" dir="rtl">
      <PageHeader
        title="خزانة الكتب الملكية 🏛️"
        description="إدارة المراجع العلمية، المذكرات الدراسية، والكتب الخارجية للمحاربين."
      >
        <AdminButton icon={Plus} onClick={() => handleOpenDialog()}>
          إضافة كتاب جديد
        </AdminButton>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "إجمالي المجلدات", value: books.length, icon: BookOpen, color: "amber" },
          { label: "إجمالي القراءات", value: books.reduce((acc, b) => acc + b.views, 0), icon: Eye, color: "blue" },
          { label: "عمليات التحميل", value: books.reduce((acc, b) => acc + b.downloads, 0), icon: Download, color: "emerald" },
          { label: "متوسط التقييم", value: (books.reduce((acc, b) => acc + b.rating, 0) / (books.length || 1)).toFixed(1), icon: Star, color: "purple" },
        ].map((stat, i) => (
          <AdminCard key={i} variant="glass" className={`p-6 bg-${stat.color}-500/5 border-${stat.color}-500/10`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl bg-${stat.color}-500/10 text-${stat.color}-500`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-black tracking-tighter">{stat.value}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
              </div>
            </div>
          </AdminCard>
        ))}
      </div>

      <AdminDataTable
        columns={columns}
        data={books}
        loading={isLoading}
        searchKey="title"
        searchPlaceholder="ابحث عن عنوان كتاب أو مؤلف..."
        actions={{ onRefresh: () => refetch() }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md bg-card/80 backdrop-blur-xl border-white/10 rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">
              {editingBook ? "تعديل المجلد" : "تدوين كتاب جديد"}
            </DialogTitle>
            <DialogDescription className="font-bold text-muted-foreground">
              أدخل بيانات الكتاب وأرفق الروابط المرجعية للتحميل.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">عنوان الكتاب</FormLabel>
                    <FormControl><Input {...field} className="rounded-xl border-white/10" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="author"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">المؤلف / القائد</FormLabel>
                      <FormControl><Input {...field} className="rounded-xl border-white/10" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="subjectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">العلم التابع له</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl border-white/10">
                            <SelectValue placeholder="اختر المادة" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl border-white/10">
                          {subjects.map((subject: any) => (
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
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">وصف المجلد</FormLabel>
                    <FormControl><Textarea {...field} className="rounded-xl border-white/10 min-h-[80px]" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="coverUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">رابط الغلاف (URL)</FormLabel>
                      <FormControl><Input {...field} className="rounded-xl border-white/10 text-xs" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="downloadUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">رابط التحميل (PDF)</FormLabel>
                      <FormControl><Input {...field} className="rounded-xl border-white/10 text-xs" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <AdminButton type="submit" className="w-full h-12 text-md font-black">
                  {editingBook ? "حفظ التغييرات" : "إيداع الكتاب بالمكتبة"}
                </AdminButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: null })}
        title="حرق المجلد نهائياً؟"
        description="سيتم حذف هذا الكتاب وجميع بيانات القراءة والتحميل الخاصة به. هل أنت متأكد؟"
        confirmText="نعم، احذف الكتاب"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
