"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminDataTable, RowActions } from "@/components/admin/ui/admin-table";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { AdminStatsCard } from "@/components/admin/ui/admin-card";
import { Badge } from "@/components/ui/badge";
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
import {
  Plus,
  Ticket,
  Search,
  Percent,
  Activity,
  TrendingUp,
  Calendar,
  Copy,
  Send,
  Hammer,
  Sparkles,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { m } from "framer-motion";

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  maxUses: number | null;
  usedCount: number;
  expiryDate: string | null;
  isActive: boolean;
  minOrderAmount: number;
  createdAt: string;
  _count?: {
    payments: number;
  };
}

const couponSchema = z.object({
  code: z.string().min(2, "الكود مطلوب (حرفين على الأقل)"),
  discountType: z.enum(["PERCENTAGE", "FIXED"]),
  discountValue: z.coerce.number().min(1, "القيمة مطلوبة"),
  description: z.string().optional(),
  maxUses: z.coerce.number().optional(),
  expiryDate: z.string().optional(),
  minOrderAmount: z.coerce.number().optional(),
  isActive: z.boolean(),
});

type CouponFormValues = z.infer<typeof couponSchema>;

export default function AdminCouponsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingCoupon, setEditingCoupon] = React.useState<Coupon | null>(null);
  const [deleteDialog, setDeleteDialog] = React.useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "inactive">("all");

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["admin", "coupons"],
    queryFn: async () => {
      const res = await fetch("/api/admin/coupons");
      if (!res.ok) throw new Error("Failed to fetch coupons");
      return (await res.json()) as Coupon[];
    },
  });

  const form = useForm<CouponFormValues>({
    resolver: zodResolver(couponSchema),
    defaultValues: {
      code: "",
      discountType: "PERCENTAGE",
      discountValue: 0,
      description: "",
      maxUses: undefined,
      expiryDate: "",
      minOrderAmount: 0,
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: CouponFormValues) => {
      const method = editingCoupon ? "PATCH" : "POST";
      const url = editingCoupon ? `/api/admin/coupons/${editingCoupon.id}` : "/api/admin/coupons";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingCoupon ? { ...values, id: editingCoupon.id } : values),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل في حفظ الكود");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(editingCoupon ? "تم تحديث كود الخصم" : "تم إنشاء كود الخصم بنجاح");
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("فشل الحذف");
    },
    onSuccess: () => {
      toast.success("تم حذف كود الخصم");
      queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
    },
    onError: () => {
      toast.error("فشل في حذف الكود");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/admin/coupons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("فشل التحديث");
    },
    onSuccess: () => {
      toast.success("تم تحديث حالة الكود");
      queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
    },
  });

  const handleOpenDialog = (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      form.reset({
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        description: coupon.description || "",
        maxUses: coupon.maxUses || undefined,
        expiryDate: coupon.expiryDate ? coupon.expiryDate.split("T")[0] : "",
        minOrderAmount: coupon.minOrderAmount || 0,
        isActive: coupon.isActive,
      });
    } else {
      setEditingCoupon(null);
      form.reset({
        code: "",
        discountType: "PERCENTAGE",
        discountValue: 0,
        description: "",
        maxUses: undefined,
        expiryDate: "",
        minOrderAmount: 0,
        isActive: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = (values: CouponFormValues) => {
    createMutation.mutate({ ...values, code: values.code.toUpperCase() });
  };

  const handleDelete = () => {
    if (!deleteDialog.id) return;
    deleteMutation.mutate(deleteDialog.id);
    setDeleteDialog({ open: false, id: null });
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`تم نسخ الكود: ${code}`);
  };

  // Filter coupons
  const filteredCoupons = coupons.filter((c) => {
    const matchesSearch = c.code.toLowerCase().includes(search.toLowerCase()) ||
      (c.description || "").toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      statusFilter === "all" ||
      (statusFilter === "active" ? c.isActive : !c.isActive);
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: coupons.length,
    active: coupons.filter((c) => c.isActive).length,
    totalUses: coupons.reduce((sum, c) => sum + (c._count?.payments || c.usedCount), 0),
    expired: coupons.filter(
      (c) => c.expiryDate && new Date(c.expiryDate) < new Date()
    ).length,
  };

  const columns: ColumnDef<Coupon>[] = [
    {
      accessorKey: "code",
      header: "كود الخصم",
      cell: ({ row }) => {
        const coupon = row.original;
        return (
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)] transition-transform hover:scale-105">
              <Ticket className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-mono font-black text-sm tracking-wider">{coupon.code}</p>
                <button
                  onClick={() => handleCopyCode(coupon.code)}
                  className="p-1 rounded hover:bg-accent transition-colors"
                >
                  <Copy className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase opacity-60 italic mt-0.5">
                {coupon.description || "لا يوجد وصف"}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "discountValue",
      header: "قيمة الخصم",
      cell: ({ row }) => {
        const coupon = row.original;
        return (
          <Badge
            variant="outline"
            className={`font-black text-sm px-3 py-1 rounded-lg ${
              coupon.discountType === "PERCENTAGE"
                ? "text-purple-500 border-purple-500/30 bg-purple-500/5"
                : "text-orange-500 border-orange-500/30 bg-orange-500/5"
            }`}
          >
            {coupon.discountValue}
            {coupon.discountType === "PERCENTAGE" ? "%" : " ج.م"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "usedCount",
      header: "الاستخدام",
      cell: ({ row }) => {
        const coupon = row.original;
        const used = coupon._count?.payments || coupon.usedCount;
        const max = coupon.maxUses;
        const percentage = max ? Math.min((used / max) * 100, 100) : 0;

        return (
          <div className="flex flex-col gap-1.5 w-28">
            <div className="flex justify-between text-[10px] text-muted-foreground font-bold">
              <span>استُخدم {used}</span>
              {max && <span>من {max}</span>}
            </div>
            {max ? (
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    percentage > 80 ? "bg-red-500" : percentage > 50 ? "bg-amber-500" : "bg-primary"
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            ) : (
              <span className="text-[9px] text-muted-foreground uppercase tracking-widest">
                استخدام مفتوح
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "expiryDate",
      header: "تاريخ الانتهاء",
      cell: ({ row }) => {
        const expiryDate = row.original.expiryDate;
        if (!expiryDate) {
          return (
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">
              مفتوح
            </span>
          );
        }
        const isExpired = new Date(expiryDate) < new Date();
        return (
          <div className="flex flex-col">
            <span className={`text-xs font-black ${isExpired ? "text-red-500" : ""}`}>
              {new Date(expiryDate).toLocaleDateString("ar-EG")}
            </span>
            {isExpired && (
              <span className="text-[9px] font-bold text-red-500/70 uppercase">منتهي الصلاحية</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "isActive",
      header: "الحالة",
      cell: ({ row }) => {
        const coupon = row.original;
        return (
          <button
            onClick={() => toggleMutation.mutate({ id: coupon.id, isActive: !coupon.isActive })}
            className="group"
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full transition-all ${
                  coupon.isActive
                    ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                    : "bg-red-500/30"
                }`}
              />
              <span
                className={`text-[10px] font-black uppercase tracking-widest group-hover:underline ${
                  coupon.isActive ? "text-emerald-500" : "text-muted-foreground"
                }`}
              >
                {coupon.isActive ? "مفعّل" : "معطّل"}
              </span>
            </div>
          </button>
        );
      },
    },
    {
      id: "actions",
      header: "التحكم",
      cell: ({ row }) => (
        <RowActions
          row={row.original}
          onEdit={handleOpenDialog}
          onDelete={(c) => setDeleteDialog({ open: true, id: c.id })}
          extraActions={[
            {
              icon: Copy,
              label: "نسخ الكود",
              onClick: (c) => handleCopyCode(c.code),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-10 pb-20" dir="rtl">
      <PageHeader
        title="إدارة أكواد الخصم والترويج 🎫"
        description="إنشاء وإدارة أكواد الخصم، متابعة الاستخدام، وتحليل أداء العروض الترويجية."
      >
        <AdminButton icon={Plus} onClick={() => handleOpenDialog()}>
          إنشاء كود جديد
        </AdminButton>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <AdminStatsCard
          title="إجمالي الأكواد"
          value={stats.total}
          icon={Ticket}
          color="blue"
          description="كود خصم في النظام"
        />
        <AdminStatsCard
          title="أكواد فعّالة"
          value={stats.active}
          icon={Activity}
          color="green"
          description="متاحة للاستخدام حالياً"
        />
        <AdminStatsCard
          title="إجمالي الاستخدامات"
          value={stats.totalUses}
          icon={TrendingUp}
          color="purple"
          description="مرة تم استخدام الأكواد"
        />
        <AdminStatsCard
          title="أكواد منتهية"
          value={stats.expired}
          icon={Calendar}
          color="red"
          description="انتهت صلاحيتها"
        />
      </div>

      {/* Table */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rpg-glass-light dark:rpg-glass p-1 rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl"
      >
        <AdminDataTable
          columns={columns}
          data={filteredCoupons}
          loading={isLoading}
          searchKey="code"
          searchPlaceholder="ابحث بالكود..."
          actions={{ onRefresh: () => queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] }) }}
          toolbar={
            <div className="flex items-center gap-3">
              <div className="relative group">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث بالكود أو الوصف..."
                  className="h-10 w-64 rounded-xl border border-border bg-accent/10 px-10 text-sm outline-none ring-primary transition focus:ring-1 font-bold"
                />
              </div>
              <div className="flex bg-accent/10 p-1 rounded-xl border border-border gap-1">
                {(["all", "active", "inactive"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
                      statusFilter === filter
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {filter === "all" ? "الكل" : filter === "active" ? "مفعّل" : "معطّل"}
                  </button>
                ))}
              </div>
            </div>
          }
        />
      </m.div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg bg-card/80 backdrop-blur-xl border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
          <div className="h-1.5 bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500" />
          <div className="p-8">
            <DialogHeader className="mb-8">
              <DialogTitle className="text-2xl font-black flex items-center gap-3">
                {editingCoupon ? (
                  <>
                    <Hammer className="w-7 h-7 text-indigo-500" />
                    تعديل كود الخصم
                  </>
                ) : (
                  <>
                    <Sparkles className="w-7 h-7 text-blue-500" />
                    إنشاء كود خصم جديد
                  </>
                )}
              </DialogTitle>
              <DialogDescription className="font-bold text-muted-foreground">
                حدد بيانات كود الخصم بدقة. الكود يتم تحويله تلقائياً لأحرف كبيرة.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">
                          كود الخصم
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="مثلاً: EID2024"
                            dir="ltr"
                            className="rounded-xl border-white/10 bg-white/5 h-12 px-4 font-mono font-black uppercase text-center"
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="discountType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">
                          نوع الخصم
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="rounded-xl border-white/10 bg-white/5 h-12">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl border-white/10">
                            <SelectItem value="PERCENTAGE" className="font-bold cursor-pointer">
                              <div className="flex items-center gap-2">
                                <Percent className="w-3.5 h-3.5" />
                                <span>نسبة مئوية</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="FIXED" className="font-bold cursor-pointer">
                              قيمة ثابتة (ج.م)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="discountValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">
                          القيمة
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            className="rounded-xl border-white/10 bg-white/5 h-12 text-center font-black"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="maxUses"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">
                          أقصى استخدام
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            placeholder="غير محدود"
                            className="rounded-xl border-white/10 bg-white/5 h-12 text-center font-bold"
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="minOrderAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">
                          الحد الأدنى (ج.م)
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            className="rounded-xl border-white/10 bg-white/5 h-12 text-center font-bold"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="expiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">
                        تاريخ الانتهاء (اختياري)
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="date"
                          className="rounded-xl border-white/10 bg-white/5 h-12 font-bold"
                        />
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
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">
                        وصف الكود (اختياري)
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="مثلاً: خصم العيد الكبير لكل الطلاب"
                          className="rounded-2xl border-white/10 bg-white/5 p-4 min-h-[80px] font-medium"
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
                    <FormItem className="flex items-center justify-between rounded-xl border border-white/10 p-4 bg-white/5">
                      <div>
                        <FormLabel className="font-black text-xs">تفعيل الكود فوراً؟</FormLabel>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                          الأكواد المفعلة تصبح متاحة مباشرة للاستخدام
                        </p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <DialogFooter className="pt-4">
                  <AdminButton
                    type="submit"
                    icon={editingCoupon ? Hammer : Send}
                    className="w-full h-14 text-md font-black shadow-xl rounded-2xl"
                    loading={createMutation.isPending}
                  >
                    {editingCoupon ? "تحديث كود الخصم" : "إنشاء كود الخصم"}
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
        title="حذف كود الخصم نهائياً؟"
        description="أنت على وشك حذف هذا الكود من النظام. لا يمكن التراجع عن هذا الإجراء."
        confirmText="نعم، احذف الكود"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
