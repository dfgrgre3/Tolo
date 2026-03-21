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
import { MoreHorizontal, Plus, Edit, Trash2, Crown } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { TableSkeleton } from "@/components/admin/ui/loading-skeleton";

interface Season {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  rewards: string | null;
  createdAt: string;
  _count: {
    participations: number;
    leaderboards: number;
  };
}

const seasonSchema = z.object({
  name: z.string().min(1, "اسم الموسم مطلوب"),
  description: z.string().optional(),
  startDate: z.string().min(1, "تاريخ البداية مطلوب"),
  endDate: z.string().min(1, "تاريخ النهاية مطلوب"),
  isActive: z.boolean(),
  rewards: z.string().optional(),
});

type SeasonFormValues = z.infer<typeof seasonSchema>;

export default function AdminSeasonsPage() {
  const [seasons, setSeasons] = React.useState<Season[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingSeason, setEditingSeason] = React.useState<Season | null>(null);
  const [deleteDialog, setDeleteDialog] = React.useState<{
    open: boolean;
    id: string | null;
  }>({ open: false, id: null });

  const form = useForm<SeasonFormValues>({
    resolver: zodResolver(seasonSchema),
    defaultValues: {
      name: "",
      description: "",
      startDate: "",
      endDate: "",
      isActive: true,
      rewards: "",
    },
  });

  const fetchSeasons = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/seasons");
      const data = await response.json();
      setSeasons(data.seasons);
    } catch (error) {
      console.error("Error fetching seasons:", error);
      toast.error("حدث خطأ أثناء جلب المواسم");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchSeasons();
  }, [fetchSeasons]);

  const handleOpenDialog = (season?: Season) => {
    if (season) {
      setEditingSeason(season);
      form.reset({
        name: season.name,
        description: season.description || "",
        startDate: season.startDate.split("T")[0],
        endDate: season.endDate.split("T")[0],
        isActive: season.isActive,
        rewards: season.rewards || "",
      });
    } else {
      setEditingSeason(null);
      form.reset({
        name: "",
        description: "",
        startDate: "",
        endDate: "",
        isActive: true,
        rewards: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (values: SeasonFormValues) => {
    try {
      const url = "/api/admin/seasons";
      const method = editingSeason ? "PATCH" : "POST";
      const body = editingSeason ? { ...values, id: editingSeason.id } : values;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(editingSeason ? "تم تحديث الموسم بنجاح" : "تم إنشاء الموسم بنجاح");
        setDialogOpen(false);
        fetchSeasons();
      } else {
        toast.error("حدث خطأ أثناء حفظ الموسم");
      }
    } catch (error) {
      console.error("Error saving season:", error);
      toast.error("حدث خطأ أثناء حفظ الموسم");
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;

    try {
      const response = await fetch("/api/admin/seasons", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteDialog.id }),
      });

      if (response.ok) {
        toast.success("تم حذف الموسم بنجاح");
        fetchSeasons();
      } else {
        toast.error("حدث خطأ أثناء حذف الموسم");
      }
    } catch (error) {
      console.error("Error deleting season:", error);
      toast.error("حدث خطأ أثناء حذف الموسم");
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  const columns: ColumnDef<Season>[] = [
    {
      accessorKey: "name",
      header: "الموسم",
      cell: ({ row }) => {
        const season = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
              <Crown className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="font-medium">{season.name}</p>
              {season.description && (
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {season.description}
                </p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "isActive",
      header: "الحالة",
      cell: ({ row }) => {
        const isActive = row.getValue("isActive") as boolean;
        return (
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "نشط" : "منتهي"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "startDate",
      header: "البداية",
      cell: ({ row }) => {
        const date = row.getValue("startDate") as string;
        return new Date(date).toLocaleDateString("ar-EG");
      },
    },
    {
      accessorKey: "endDate",
      header: "النهاية",
      cell: ({ row }) => {
        const date = row.getValue("endDate") as string;
        return new Date(date).toLocaleDateString("ar-EG");
      },
    },
    {
      id: "participations",
      header: "المشاركين",
      cell: ({ row }) => {
        const season = row.original;
        return <span>{season._count.participations} مشارك</span>;
      },
    },
    {
      accessorKey: "createdAt",
      header: "تاريخ الإنشاء",
      cell: ({ row }) => {
        const date = row.getValue("createdAt") as string;
        return new Date(date).toLocaleDateString("ar-EG");
      },
    },
    {
      id: "actions",
      header: "الإجراءات",
      cell: ({ row }) => {
        const season = row.original;
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
              <DropdownMenuItem onClick={() => handleOpenDialog(season)}>
                <Edit className="ml-2 h-4 w-4" />
                تعديل القواعد
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.success("تم إرسال أمر لتصفير الـ Leaderboard وبدء الموسم الجديد للمحاربين.")}>
                <Crown className="ml-2 h-4 w-4 text-amber-500" />
                تفعيل وإعادة تعيين الـ Leaderboard
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive font-bold"
                onClick={() => setDeleteDialog({ open: true, id: season.id })}
              >
                <Trash2 className="ml-2 h-4 w-4" />
                حذف الموسم نهائياً
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
        title="المواسم القتالية (Battle Passes)"
        description="إدارة المواسم التعليمية، ضبط جوائز الـ Battle Pass، وجدولة عملية تصفير الـ Leaderboard التلقائية في بداية كل فصل و نهاية كل فترة."
      >
        <Button onClick={() => handleOpenDialog()} className="h-12 rounded-xl text-lg font-bold gap-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
          <Plus className="h-5 w-5" />
          إعلان موسم جديد
        </Button>
      </PageHeader>

      {loading ? (
        <TableSkeleton rows={4} cols={6} />
      ) : (
        <DataTable
          columns={columns}
          data={seasons}
          searchKey="name"
          searchPlaceholder="البحث عن موسم..."
        />
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSeason ? "تعديل الموسم" : "إضافة موسم جديد"}
            </DialogTitle>
            <DialogDescription>
              أدخل بيانات الموسم
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم الموسم *</FormLabel>
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
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تاريخ البداية *</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تاريخ النهاية *</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="rewards"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المكافآت</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="وصف المكافآت..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                <Button type="submit">
                  {editingSeason ? "تحديث" : "إنشاء"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: null })}
        title="حذف الموسم"
        description="هل أنت متأكد من حذف هذا الموسم؟"
        confirmText="حذف"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
