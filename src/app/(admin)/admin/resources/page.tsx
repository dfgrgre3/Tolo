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
import { MoreHorizontal, Plus, Edit, Trash2, ExternalLink, Link, FileText, Video, File } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { TableSkeleton } from "@/components/admin/ui/loading-skeleton";

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
  title: z.string().min(1, "العنوان مطلوب"),
  description: z.string().optional(),
  url: z.string().url("الرابط غير صالح"),
  type: z.string().min(1, "النوع مطلوب"),
  source: z.string().optional(),
  free: z.boolean(),
  subjectId: z.string().min(1, "المادة مطلوبة"),
});

type ResourceFormValues = z.infer<typeof resourceSchema>;

const resourceTypes = [
  { value: "link", label: "رابط", icon: Link },
  { value: "video", label: "فيديو", icon: Video },
  { value: "pdf", label: "PDF", icon: FileText },
  { value: "document", label: "مستند", icon: File },
];

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
      subjectId: "",
    },
  });

  const fetchResources = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/resources");
      const data = await response.json();
      setResources(data.resources);
    } catch (error) {
      console.error("Error fetching resources:", error);
      toast.error("حدث خطأ أثناء جلب الموارد");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSubjects = React.useCallback(async () => {
    try {
      const response = await fetch("/api/admin/subjects?limit=100");
      const data = await response.json();
      setSubjects(data.subjects);
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
        subjectId: resource.subject.id,
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
        subjectId: "",
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
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(editingResource ? "تم تحديث المورد بنجاح" : "تم إنشاء المورد بنجاح");
        setDialogOpen(false);
        fetchResources();
      } else {
        toast.error("حدث خطأ أثناء حفظ المورد");
      }
    } catch (error) {
      console.error("Error saving resource:", error);
      toast.error("حدث خطأ أثناء حفظ المورد");
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;

    try {
      const response = await fetch("/api/admin/resources", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteDialog.id }),
      });

      if (response.ok) {
        toast.success("تم حذف المورد بنجاح");
        fetchResources();
      } else {
        toast.error("حدث خطأ أثناء حذف المورد");
      }
    } catch (error) {
      console.error("Error deleting resource:", error);
      toast.error("حدث خطأ أثناء حذف المورد");
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  const columns: ColumnDef<Resource>[] = [
    {
      accessorKey: "title",
      header: "المورد",
      cell: ({ row }) => {
        const resource = row.original;
        const typeInfo = resourceTypes.find(t => t.value === resource.type);
        const Icon = typeInfo?.icon || Link;
        return (
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: resource.subject.color || "#3b82f6" }}
            >
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-medium">{resource.title}</p>
              {resource.source && (
                <p className="text-sm text-muted-foreground">{resource.source}</p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "subject",
      header: "المادة",
      cell: ({ row }) => {
        const resource = row.original;
        return (
          <Badge variant="outline" style={{ borderColor: resource.subject.color || "#3b82f6" }}>
            {resource.subject.nameAr || resource.subject.name}
          </Badge>
        );
      },
    },
    {
      accessorKey: "type",
      header: "النوع",
      cell: ({ row }) => {
        const type = row.getValue("type") as string;
        const typeInfo = resourceTypes.find(t => t.value === type);
        return typeInfo?.label || type;
      },
    },
    {
      accessorKey: "free",
      header: "الوصول",
      cell: ({ row }) => {
        const free = row.getValue("free") as boolean;
        return (
          <Badge variant={free ? "default" : "secondary"}>
            {free ? "مجاني" : "مدفوع"}
          </Badge>
        );
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
        const resource = row.original;
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
              <DropdownMenuItem onClick={() => window.open(resource.url, "_blank")}>
                <ExternalLink className="ml-2 h-4 w-4" />
                فتح الرابط
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOpenDialog(resource)}>
                <Edit className="ml-2 h-4 w-4" />
                تعديل
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setDeleteDialog({ open: true, id: resource.id })}
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
        title="إدارة الموارد"
        description="عرض وإدارة جميع الموارد التعليمية"
      >
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="ml-2 h-4 w-4" />
          إضافة مورد
        </Button>
      </PageHeader>

      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : (
        <DataTable
          columns={columns}
          data={resources}
          searchKey="title"
          searchPlaceholder="البحث عن مورد..."
          bulkActions={[
            {
              label: "حذف المحدد",
              icon: Trash2,
              variant: "destructive",
              onClick: async (rows) => {
                const ids = rows.map(r => r.id);
                if (confirm(`هل أنت متأكد من حذف ${ids.length} من الموارد؟`)) {
                  try {
                    const res = await fetch("/api/admin/resources", {
                      method: "DELETE",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ ids }),
                    });
                    if (res.ok) {
                      toast.success("تم حذف الموارد بنجاح");
                      fetchResources();
                    }
                  } catch (err) {
                    toast.error("حدث خطأ أثناء الحذف");
                  }
                }
              }
            },
            {
              label: "جعله مجاني",
              icon: ExternalLink,
              onClick: async (rows) => {
                const ids = rows.map(r => r.id);
                try {
                  const res = await fetch("/api/admin/resources", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ids, free: true }),
                  });
                  if (res.ok) {
                    toast.success("تم تحديث الموارد بنجاح");
                    fetchResources();
                  }
                } catch (err) {
                  toast.error("حدث خطأ أثناء التحديث");
                }
              }
            },
            {
              label: "جعله مدفوع",
              icon: FileText,
              onClick: async (rows) => {
                const ids = rows.map(r => r.id);
                try {
                  const res = await fetch("/api/admin/resources", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ids, free: false }),
                  });
                  if (res.ok) {
                    toast.success("تم تحديث الموارد بنجاح");
                    fetchResources();
                  }
                } catch (err) {
                  toast.error("حدث خطأ أثناء التحديث");
                }
              }
            }
          ]}
        />
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingResource ? "تعديل المورد" : "إضافة مورد جديد"}
            </DialogTitle>
            <DialogDescription>
              أدخل بيانات المورد التعليمي
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
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>النوع *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر النوع" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {resourceTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
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
                  name="free"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <FormLabel>مجاني</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الرابط *</FormLabel>
                    <FormControl>
                      <Input {...field} type="url" dir="ltr" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المصدر</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
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
              <DialogFooter>
                <Button type="submit">
                  {editingResource ? "تحديث" : "إنشاء"}
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
        title="حذف المورد"
        description="هل أنت متأكد من حذف هذا المورد؟"
        confirmText="حذف"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
