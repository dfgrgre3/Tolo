"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminDataTable, RowActions } from "@/components/admin/ui/admin-table";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { RoleBadge, StatusBadge } from "@/components/admin/ui/admin-badge";
import { AdminStatsCard } from "@/components/admin/ui/admin-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, Download, Mail, Shield, Crown, Users, Zap, Search, Send } from "lucide-react";
import { exportToCSV, ExportColumn } from '@/lib/export-utils';
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { RoyalCallModal as RoyalMessageModal } from "@/components/admin/royal-call";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";
import { m } from "framer-motion";
import { apiRoutes } from "@/lib/api/routes";

interface UserModel {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  avatar: string | null;
  role: "ADMIN" | "TEACHER" | "STUDENT" | "MODERATOR" | "USER";
  permissions: string[];
  emailVerified: boolean | null;
  createdAt: string;
  lastLogin: string | null;
  totalXP: number;
  level: number;
  currentStreak: number;
  _count: {
    tasks: number;
    studySessions: number;
    achievements: number;
  };
}

interface ApiResponse {
  data: {
    users: UserModel[];
    summary: {
      totalUsers: number;
      totalAdmins: number;
      powerUsers: number;
    };
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);
  const [search, setSearch] = React.useState("");
  const [role] = React.useState<string>("all");
  const [deleteDialog, setDeleteDialog] = React.useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });
  const [messageDialog, setMessageDialog] = React.useState<{ open: boolean; users: UserModel[] }>({
    open: false,
    users: [],
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "users", page, limit, search, role],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        ...(role !== "all" && { role }),
      });
      const response = await fetch(`${apiRoutes.admin.users}?${params}`);
      if (!response.ok) throw new Error("Failed to fetch users");
      return (await response.json()) as ApiResponse;
    },
  });

  const handleDelete = async () => {
    if (!deleteDialog.id) return;
    try {
      const response = await fetch(`${apiRoutes.admin.users}?userId=${deleteDialog.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        toast.success("تم حذف المحارب من السجلات");
        refetch();
      } else {
        toast.error("فشل في حذف السجل");
      }
    } catch (err: unknown) {
      toast.error("خطأ في الاتصال بالخادم");
      console.error(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  const handleExportCSV = () => {
    if (!data?.data?.users || data.data.users.length === 0) {
      toast.error('لا توجد بيانات للتصدير');
      return;
    }
    const exportColumns: ExportColumn<UserModel>[] = [
      { header: 'الاسم', accessor: (u) => u.name || u.username || "بدون اسم" },
      { header: 'البريد الإلكتروني', accessor: 'email' },
      { header: 'الرتبة', accessor: 'role' },
      { header: 'القوة (XP)', accessor: (u) => u.totalXP || 0 },
      { header: 'تاريخ الالتحاق', accessor: (u) => new Date(u.createdAt).toLocaleDateString('ar-EG') },
      { header: 'آخر دخول', accessor: (u) => u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('ar-EG') : 'لم يسجل دخول' },
    ];
    exportToCSV(data.data.users, exportColumns, 'users');
    toast.success('تم التصدير بنجاح');
  };

  const columns: ColumnDef<UserModel>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="تحديد الكل"
          className="translate-y-[2px] border-white/20"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="تحديد الصف"
          className="translate-y-[2px] border-white/20"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: "المحارب",
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="relative group">
              <Avatar className="h-10 w-10 border-2 border-primary/20 transition-transform group-hover:scale-110">
                <AvatarImage src={user.avatar || ""} />
                <AvatarFallback className="font-bold bg-primary/10 text-primary">
                  {user.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 border border-border shadow-sm">
                <div className="bg-primary text-[8px] font-black text-white px-1 rounded-full uppercase tracking-tighter">
                  LVL {user.level || 1}
                </div>
              </div>
            </div>
            <div>
              <p className="font-black text-sm tracking-tight">{user.name || user.username || "بدون اسم"}</p>
              <p className="text-[10px] text-muted-foreground font-bold opacity-60 italic">{user.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "role",
      header: "الرتبة العسكرية",
      cell: ({ row }) => <RoleBadge role={row.original.role} />,
    },
    {
      accessorKey: "totalXP",
      header: "القوة (XP)",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-black text-amber-500 flex items-center gap-1">
            <Zap className="w-3 h-3 fill-amber-500" />
            {(row.original.totalXP || 0).toLocaleString()} XP
          </span>
          <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">
            {row.original._count?.tasks || 0} مهمة مكتملة
          </span>
        </div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "تاريخ الالتحاق",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-sm font-black">{new Date(row.original.createdAt).toLocaleDateString("ar-EG")}</span>
          <span className="text-[10px] text-muted-foreground font-bold italic">
            منذ {Math.floor((Date.now() - new Date(row.original.createdAt).getTime()) / (1000 * 60 * 60 * 24))} يوم
          </span>
        </div>
      ),
    },
    {
      accessorKey: "emailVerified",
      header: "الحالة",
      cell: ({ row }) => <StatusBadge status={row.original.emailVerified ? "verified" : "unverified"} />,
    },
    {
      id: "actions",
      header: "العمليات",
      cell: ({ row }) => (
        <RowActions
          row={row.original}
          onView={(u) => router.push(`/admin/users/${u.id}`)}
          onEdit={(u) => router.push(`/admin/users/${u.id}/edit`)}
          onDelete={(u) => setDeleteDialog({ open: true, id: u.id })}
          extraActions={[
            { icon: Mail, label: "رسالة ملكية", onClick: (u) => setMessageDialog({ open: true, users: [u] }) },
            { icon: Shield, label: "صلاحيات القائد", onClick: (u) => router.push(`/admin/users/${u.id}/permissions`) },
            {
              icon: Shield, label: "تقمص شخصية", onClick: async (u) => {
                if (window.confirm("هل أنت متأكد من تقمص شخصية هذا المستخدم؟ سيتم تسجيل دخولك كهذا المستخدم.")) {
                  try {
                    const res = await fetch('/api/admin/impersonate', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ targetUserId: u.id }),
                      credentials: 'include'
                    });
                    if (res.ok) {
                      toast.success('تم تقمص الشخصية، جاري التوجيه...');
                      window.location.href = '/';
                    } else {
                      const data = await res.json();
                      toast.error(data.error || 'فشل في تقمص الشخصية');
                    }
                  } catch (_error) {
                    toast.error('خطأ في الاتصال');
                  }
                }
              }
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-10 pb-20" dir="rtl">
      <PageHeader
        title="سجلات جيش المملكة âڑ”ï¸ڈ"
        description="إدارة جميع المحاربين، رتبهم العسكرية، وصلاحياتهم داخل الإمبراطورية."
      >
        <div className="flex items-center gap-3">
          <AdminButton variant="outline" icon={Download} onClick={handleExportCSV}>
            تصدير المستخدمين CSV
          </AdminButton>
          <AdminButton icon={UserPlus} onClick={() => router.push("/admin/users/create")}>
            تجنيد محارب جديد
          </AdminButton>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AdminStatsCard
          title="إجمالي المحاربين"
          value={data?.data?.summary?.totalUsers || 0}
          icon={Users}
          color="blue"
          description="جندي في المملكة"
        />

        <AdminStatsCard
          title="القادة والنبلاء"
          value={data?.data?.summary?.totalAdmins || 0}
          icon={Crown}
          color="yellow"
          description="حساب إداري فعال"
        />

        <AdminStatsCard
          title="محاربين متمرسين"
          value={data?.data?.summary?.powerUsers || 0}
          icon={Zap}
          color="green"
          description="رتبة محارب متمرس"
        />
      </div>

      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rpg-glass-light dark:rpg-glass p-1 rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl"
      >
        <AdminDataTable
          columns={columns}
          data={data?.data?.users || []}
          loading={isLoading}
          searchKey="name"
          searchPlaceholder="ابحث في سجلات الجيش..."
          serverSide
          selectable
          bulkActions={[
            {
              label: "إرسال مرسوم ملكي",
              icon: Send,
              onClick: (rows) => setMessageDialog({ open: true, users: rows })
            },
            {
              label: "حذف السجلات",
              icon: UserPlus,
              variant: "destructive",
              onClick: (_rows) => toast.warning("يرجى حذف كل مستخدم على حدة لضمان السلامة")
            },
          ]}
          totalRows={data?.data?.pagination?.total || 0}
          pageCount={data?.data?.pagination?.totalPages || 1}
          currentPage={page}
          onPageChange={setPage}
          onPageSizeChange={setLimit}
          pageSize={limit}
          actions={{
            onRefresh: () => refetch(),
          }}
          toolbar={
            <div className="flex items-center gap-2">
              <div className="relative group">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <input
                  type="text"
                  placeholder="فلترة السجلات..."
                  className="bg-accent/10 border border-border rounded-xl h-10 px-10 text-sm focus:ring-1 ring-primary outline-none w-64 font-bold"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          }
        />
      </m.div>

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: null })}
        title="تجريد محارب من رتبته؟"
        description="هل أنت متأكد من حذف هذا السجل؟ سيتم مسح جميع إنجازات المحارب ونقاط القوة (XP) الخاصة به نهائياً."
        confirmText="تأكيد الحذف النهائي"
        variant="destructive"
        onConfirm={handleDelete}
      />
      <RoyalMessageModal
        open={messageDialog.open}
        onOpenChange={(open) => setMessageDialog({ open, users: open ? messageDialog.users : [] })}
        users={messageDialog.users}
      />
    </div>
  );
}
