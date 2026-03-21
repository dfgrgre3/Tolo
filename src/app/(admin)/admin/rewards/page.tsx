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
import { MoreHorizontal, Plus, Edit, Trash2, Gift, Users, Download, Upload } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { TableSkeleton } from "@/components/admin/ui/loading-skeleton";

interface Reward {
  id: string;
  name: string;
  description: string;
  type: string;
  rarity: string;
  imageUrl: string | null;
  metadata: string | null;
  isTradeable: boolean;
  isActive: boolean;
  createdAt: string;
  _count: {
    userRewards: number;
  };
}

const rewardSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  description: z.string().min(1, "الوصف مطلوب"),
  type: z.string().min(1, "النوع مطلوب"),
  rarity: z.string().min(1, "الندرة مطلوبة"),
  imageUrl: z.string().url("الرابط غير صالح").optional().or(z.literal("")),
  isTradeable: z.boolean(),
  isActive: z.boolean(),
});

type RewardFormValues = z.infer<typeof rewardSchema>;

const rewardTypes = [
  { value: "badge", label: "شارة" },
  { value: "title", label: "لقب" },
  { value: "avatar_frame", label: "إطار صورة" },
  { value: "effect", label: "تأثير" },
  { value: "item", label: "عنصر" },
];

const rarityColors: Record<string, string> = {
  common: "bg-gray-500",
  uncommon: "bg-green-500",
  rare: "bg-blue-500",
  epic: "bg-purple-500",
  legendary: "bg-yellow-500",
};

const rarityLabels: Record<string, string> = {
  common: "عادي",
  uncommon: "غير عادي",
  rare: "نادر",
  epic: "ملحمي",
  legendary: "أسطوري",
};

export default function AdminRewardsPage() {
  const [rewards, setRewards] = React.useState<Reward[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingReward, setEditingReward] = React.useState<Reward | null>(null);
  const [deleteDialog, setDeleteDialog] = React.useState<{
    open: boolean;
    id: string | null;
  }>({ open: false, id: null });

  const form = useForm<RewardFormValues>({
    resolver: zodResolver(rewardSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "badge",
      rarity: "common",
      imageUrl: "",
      isTradeable: false,
      isActive: true,
    },
  });

  const fetchRewards = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/rewards");
      const data = await response.json();
      setRewards(data.rewards);
    } catch (error) {
      console.error("Error fetching rewards:", error);
      toast.error("حدث خطأ أثناء جلب المكافآت");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  const handleOpenDialog = (reward?: Reward) => {
    if (reward) {
      setEditingReward(reward);
      form.reset({
        name: reward.name,
        description: reward.description,
        type: reward.type,
        rarity: reward.rarity,
        imageUrl: reward.imageUrl || "",
        isTradeable: reward.isTradeable,
        isActive: reward.isActive,
      });
    } else {
      setEditingReward(null);
      form.reset({
        name: "",
        description: "",
        type: "badge",
        rarity: "common",
        imageUrl: "",
        isTradeable: false,
        isActive: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (values: RewardFormValues) => {
    try {
      const url = "/api/admin/rewards";
      const method = editingReward ? "PATCH" : "POST";
      const body = editingReward ? { ...values, id: editingReward.id } : values;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(editingReward ? "تم تحديث المكافأة بنجاح" : "تم إنشاء المكافأة بنجاح");
        setDialogOpen(false);
        fetchRewards();
      } else {
        toast.error("حدث خطأ أثناء حفظ المكافأة");
      }
    } catch (error) {
      console.error("Error saving reward:", error);
      toast.error("حدث خطأ أثناء حفظ المكافأة");
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;

    try {
      const response = await fetch("/api/admin/rewards", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteDialog.id }),
      });

      if (response.ok) {
        toast.success("تم حذف المكافأة بنجاح");
        fetchRewards();
      } else {
        toast.error("حدث خطأ أثناء حذف المكافأة");
      }
    } catch (error) {
      console.error("Error deleting reward:", error);
      toast.error("حدث خطأ أثناء حذف المكافأة");
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  const handleExport = () => {
    const exportData = rewards.map((reward) => ({
      name: reward.name,
      description: reward.description,
      type: reward.type,
      rarity: reward.rarity,
      imageUrl: reward.imageUrl,
      isTradeable: reward.isTradeable,
      isActive: reward.isActive,
    }));
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `rewards-${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    toast.success("تم تصدير المكافآت بنجاح");
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (!Array.isArray(imported)) {
          throw new Error("الملف يجب أن يحتوي على مصفوفة من المكافآت");
        }
        
        let importedCount = 0;
        for (const reward of imported) {
          try {
            const response = await fetch("/api/admin/rewards", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(reward),
            });
            if (response.ok) importedCount++;
          } catch {
            // Skip failed imports
          }
        }
        
        toast.success(`تم استيراد ${importedCount} مكافأة بنجاح`);
        fetchRewards();
      } catch {
        toast.error("فشل في قراءة ملف المكافآت");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const columns: ColumnDef<Reward>[] = [
    {
      accessorKey: "name",
      header: "المكافأة",
      cell: ({ row }) => {
        const reward = row.original;
        return (
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${rarityColors[reward.rarity]}`}
            >
              <Gift className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-medium">{reward.name}</p>
              <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                {reward.description}
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
        const typeInfo = rewardTypes.find(t => t.value === type);
        return typeInfo?.label || type;
      },
    },
    {
      accessorKey: "rarity",
      header: "الندرة",
      cell: ({ row }) => {
        const rarity = row.getValue("rarity") as string;
        return (
          <Badge className={`${rarityColors[rarity]} text-white`}>
            {rarityLabels[rarity] || rarity}
          </Badge>
        );
      },
    },
    {
      accessorKey: "isTradeable",
      header: "قابل للتداول",
      cell: ({ row }) => {
        const tradeable = row.getValue("isTradeable") as boolean;
        return (
          <Badge variant={tradeable ? "default" : "secondary"}>
            {tradeable ? "نعم" : "لا"}
          </Badge>
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
            {isActive ? "نشط" : "معطل"}
          </Badge>
        );
      },
    },
    {
      id: "owners",
      header: "المالكين",
      cell: ({ row }) => {
        const reward = row.original;
        return (
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{reward._count.userRewards}</span>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "الإجراءات",
      cell: ({ row }) => {
        const reward = row.original;
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
              <DropdownMenuItem onClick={() => handleOpenDialog(reward)}>
                <Edit className="ml-2 h-4 w-4" />
                تعديل
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setDeleteDialog({ open: true, id: reward.id })}
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
        title="إدارة المكافآت"
        description="عرض وإدارة جميع المكافآت والجوائز"
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="ml-2 h-4 w-4" />
            تصدير
          </Button>
          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Button variant="outline" size="sm">
              <Upload className="ml-2 h-4 w-4" />
              استيراد
            </Button>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="ml-2 h-4 w-4" />
            إضافة مكافأة
          </Button>
        </div>
      </PageHeader>

      {loading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : (
        <DataTable
          columns={columns}
          data={rewards}
          searchKey="name"
          searchPlaceholder="البحث عن مكافأة..."
        />
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingReward ? "تعديل المكافأة" : "إضافة مكافأة جديدة"}
            </DialogTitle>
            <DialogDescription>
              أدخل بيانات المكافأة
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الاسم *</FormLabel>
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
                    <FormLabel>الوصف *</FormLabel>
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
                      <FormLabel>النوع *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر النوع" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {rewardTypes.map((type) => (
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
                  name="rarity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الندرة *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر الندرة" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(rarityLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
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
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رابط الصورة</FormLabel>
                    <FormControl>
                      <Input {...field} type="url" dir="ltr" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="isTradeable"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <FormLabel>قابل للتداول</FormLabel>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="submit">
                  {editingReward ? "تحديث" : "إنشاء"}
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
        title="حذف المكافأة"
        description="هل أنت متأكد من حذف هذه المكافأة؟"
        confirmText="حذف"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
