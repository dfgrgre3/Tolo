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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { MoreHorizontal, Plus, Edit, Trash2, Megaphone, Bell, Calendar, Eye } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { TableSkeleton } from "@/components/admin/ui/loading-skeleton";

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
  title: z.string().min(1, "العنوان مطلوب"),
  content: z.string().min(1, "المحتوى مطلوب"),
  type: z.string(),
  priority: z.number(),
  isActive: z.boolean(),
});

type AnnouncementFormValues = z.infer<typeof announcementSchema>;

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = React.useState<Announcement[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [deleteDialog, setDeleteDialog] = React.useState<{
    open: boolean;
    id: string | null;
  }>({ open: false, id: null });

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

  const fetchAnnouncements = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/announcements");
      const data = await response.json();
      setAnnouncements(data.announcements);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      toast.error("حدث خطأ أثناء جلب الإعلانات");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleSubmit = async (values: AnnouncementFormValues) => {
    try {
      const response = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, authorId: "admin" }),
      });

      if (response.ok) {
        toast.success("تم إنشاء الإعلان بنجاح");
        setDialogOpen(false);
        form.reset();
        fetchAnnouncements();
      } else {
        toast.error("حدث خطأ أثناء حفظ الإعلان");
      }
    } catch (error) {
      console.error("Error saving announcement:", error);
      toast.error("حدث خطأ أثناء حفظ الإعلان");
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
        toast.success("تم حذف الإعلان بنجاح");
        fetchAnnouncements();
      } else {
        toast.error("حدث خطأ أثناء حذف الإعلان");
      }
    } catch (error) {
      console.error("Error deleting announcement:", error);
      toast.error("حدث خطأ أثناء حذف الإعلان");
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  const typeColors: Record<string, string> = {
    INFO: "bg-blue-500",
    SUCCESS: "bg-green-500",
    WARNING: "bg-yellow-500",
    ERROR: "bg-red-500",
  };

  const typeLabels: Record<string, string> = {
    INFO: "معلومة",
    SUCCESS: "نجاح",
    WARNING: "تحذير",
    ERROR: "خطأ",
  };

  const columns: ColumnDef<Announcement>[] = [
    {
      accessorKey: "title",
      header: "الإعلان",
      cell: ({ row }) => {
        const announcement = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Bell className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="font-medium">{announcement.title}</p>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {announcement.content}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "type",
      header: "النوع",
      cell: ({ row }) => {
        const type = row.getValue("type") as string;
        return (
          <Badge className={`${typeColors[type]} text-white`}>
            {typeLabels[type] || type}
          </Badge>
        );
      },
    },
    {
      accessorKey: "priority",
      header: "الأولوية",
      cell: ({ row }) => {
        const priority = row.getValue("priority") as number;
        return <span>{priority}</span>;
      },
    },
    {
      accessorKey: "isActive",
      header: "الحالة",
      cell: ({ row }) => {
        const isActive = row.getValue("isActive") as boolean;
        return (
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "نشط" : "معطل"}
          </Badge>
        );
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
        const announcement = row.original;
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
              <DropdownMenuItem>
                <Edit className="ml-2 h-4 w-4" />
                تعديل
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setDeleteDialog({ open: true, id: announcement.id })}
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
        title="إدارة الإعلانات"
        description="عرض وإدارة جميع إعلانات النظام"
      >
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="ml-2 h-4 w-4" />
          إضافة إعلان
        </Button>
      </PageHeader>

      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : (
        <DataTable
          columns={columns}
          data={announcements}
          searchKey="title"
          searchPlaceholder="البحث عن إعلان..."
        />
      )}

      {/* Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة إعلان جديد</DialogTitle>
            <DialogDescription>
              أدخل بيانات الإعلان
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>العنوان *</FormLabel>
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
                      <Textarea {...field} />
                    </FormControl>
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
                      <FormLabel>النوع</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="INFO">معلومة</SelectItem>
                          <SelectItem value="SUCCESS">نجاح</SelectItem>
                          <SelectItem value="WARNING">تحذير</SelectItem>
                          <SelectItem value="ERROR">خطأ</SelectItem>
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
                      <FormLabel>الأولوية</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
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
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <FormLabel>نشط</FormLabel>
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
                <Button type="submit">إنشاء</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: null })}
        title="حذف الإعلان"
        description="هل أنت متأكد من حذف هذا الإعلان؟"
        confirmText="حذف"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
