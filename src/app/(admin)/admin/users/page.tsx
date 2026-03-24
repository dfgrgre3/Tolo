"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminDataTable, RowActions } from "@/components/admin/ui/admin-table";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { RoleBadge, StatusBadge } from "@/components/admin/ui/admin-badge";
import { AdminCard } from "@/components/admin/ui/admin-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, Download, Mail, Shield, Crown, Users, Zap, Search } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { useQuery } from "@tanstack/react-query";

interface UserModel {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  avatar: string | null;
  role: string;
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
  users: UserModel[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
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

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "users", page, limit, search, role],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        ...(role !== "all" && { role }),
      });
      const response = await fetch(`/api/admin/users?${params}`);
      if (!response.ok) throw new Error("Failed to fetch users");
      return (await response.json()) as ApiResponse;
    },
  });

  const handleDelete = async () => {
    if (!deleteDialog.id) return;
    try {
      const response = await fetch(`/api/admin/users?userId=${deleteDialog.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        toast.success("تم حذف المحارب من السجلات");
        refetch();
      } else {
        toast.error("فشل في حذف السجل");
      }
    } catch (_error) {
      toast.error("خطأ في الاتصال بالخادم");
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  const columns: ColumnDef<UserModel>[] = [
    {
      accessorKey: "name",
      header: "المحارب",
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10 border-2 border-primary/20">
                <AvatarImage src={user.avatar || ""} />
                <AvatarFallback className="font-bold bg-primary/10 text-primary">
                  {user.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 border border-border">
                <div className="bg-primary text-[8px] font-black text-white px-1 rounded-full">
                  LVL {user.level}
                </div>
              </div>
            </div>
            <div>
              <p className="font-bold text-sm tracking-tight">{user.name || user.username || "بدون اسم"}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "role",
      header: "الرتبة العسكرية",
      cell: ({ row }) => <RoleBadge role={row.original.role as any} />,
    },
    {
      accessorKey: "totalXP",
      header: "القوة (XP)",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-black text-amber-500">{row.original.totalXP.toLocaleString()} XP</span>
          <span className="text-[10px] text-muted-foreground">{row.original._count.tasks} مهمة مكتملة</span>
        </div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "تاريخ الالتحاق",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium">{new Date(row.original.createdAt).toLocaleDateString("ar-EG")}</span>
          <span className="text-[10px] text-muted-foreground">منذ {Math.floor((Date.now() - new Date(row.original.createdAt).getTime()) / (1000 * 60 * 60 * 24))} يوم</span>
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
            { icon: Mail, label: "إرسال رسالة رتبة", onClick: (u) => toast.info(`جاري توجيه رسالة إلى ${u.email}`) },
            { icon: Shield, label: "تعديل الصلاحيات", onClick: (u) => router.push(`/admin/users/${u.id}/permissions`) },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-8 pb-20" dir="rtl">
      <PageHeader
        title="سجلات جيش المملكة ⚔️"
        description="إدارة جميع المحاربين، رتبهم العسكرية، وصلاحياتهم داخل الإمبراطورية."
      >
        <div className="flex items-center gap-3">
          <AdminButton variant="outline" icon={Download} onClick={() => toast.success("جاري تصدير المخطوطات...")}>
            تصدير الجيش
          </AdminButton>
          <AdminButton icon={UserPlus} onClick={() => router.push("/admin/users/create")}>
            تجنيد محارب جديد
          </AdminButton>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AdminCard variant="glass" className="p-6 flex items-center gap-4 bg-blue-500/5 border-blue-500/20">
          <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-500">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <p className="text-3xl font-black">{data?.pagination?.total || 0}</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">إجمالي المحاربين</p>
          </div>
        </AdminCard>
        
        <AdminCard variant="glass" className="p-6 flex items-center gap-4 bg-amber-500/5 border-amber-500/20">
          <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-500">
            <Crown className="w-8 h-8" />
          </div>
          <div>
            <p className="text-3xl font-black">{data?.users?.filter(u => u.role === "ADMIN").length || 0}</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">القادة والنبلاء</p>
          </div>
        </AdminCard>

        <AdminCard variant="glass" className="p-6 flex items-center gap-4 bg-emerald-500/5 border-emerald-500/20">
          <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-500">
            <Zap className="w-8 h-8" />
          </div>
          <div>
            <p className="text-3xl font-black">{data?.users?.filter(u => u.level > 10).length || 0}</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">محاربين متمرسين</p>
          </div>
        </AdminCard>
      </div>

      <AdminDataTable
        columns={columns}
        data={data?.users || []}
        loading={isLoading}
        searchKey="name"
        searchPlaceholder="ابحث عن اسم، إيميل، أو معرف..."
        serverSide
        totalRows={data?.pagination?.total || 0}
        pageCount={data?.pagination?.totalPages || 1}
        currentPage={page}
        onPageChange={setPage}
        onPageSizeChange={setLimit}
        pageSize={limit}
        actions={{
          onRefresh: () => refetch(),
        }}
        toolbar={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="فلترة البحث..." 
                className="bg-accent/20 border border-border rounded-xl h-10 px-10 text-sm focus:ring-1 ring-primary outline-none w-64"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        }
      />

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: null })}
        title="تجريد محارب من رتبته؟"
        description="هل أنت متأكد من حذف هذا السجل؟ سيتم مسح جميع إنجازات المحارب ونقاط القوة (XP) الخاصة به نهائياً."
        confirmText="تأكيد الحذف النهائي"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
