"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminDataTable, RowActions } from "@/components/admin/ui/admin-table";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { AdminStatsCard } from "@/components/admin/ui/admin-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, UserPlus, Search, GraduationCap, BookOpen, Star, Trash2, Edit } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRoutes } from "@/lib/api/routes";
import { adminFetch } from "@/lib/api/admin-api";
import { toast } from "sonner";
import { AdminConfirm } from "@/components/admin/ui/admin-confirm";
import { ColumnDef } from "@tanstack/react-table";

interface TeacherModel {
  id: string;
  name: string;
  subjectId: string;
  onlineUrl: string | null;
  rating: number;
  notes: string | null;
  createdAt: string;
  subject?: {
    name: string;
    nameAr: string | null;
    color: string | null;
  };
}

interface ApiResponse {
  data: {
    teachers: TeacherModel[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export default function AdminTeachersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);
  const [search, setSearch] = React.useState("");
  const [deleteDialog, setDeleteDialog] = React.useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "teachers", page, limit, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
      });
      const response = await adminFetch(`${apiRoutes.admin.teachers}?${params}`);
      if (!response.ok) throw new Error("Failed to fetch teachers");
      return (await response.json()) as ApiResponse;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await adminFetch(apiRoutes.admin.teachers, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error("Failed to delete teacher");
      return response.json();
    },
    onSuccess: () => {
      toast.success("تم حذف المعلم بنجاح");
      queryClient.invalidateQueries({ queryKey: ["admin", "teachers"] });
      setDeleteDialog({ open: false, id: null });
    },
    onError: () => {
      toast.error("فشل في حذف المعلم");
    },
  });

  const columns: ColumnDef<TeacherModel>[] = [
    {
      accessorKey: "name",
      header: "المعلم",
      cell: ({ row }) => {
        const teacher = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-primary/20">
              <AvatarImage src="" />
              <AvatarFallback className="font-bold bg-primary/10 text-primary">
                {teacher.name?.charAt(0) || "T"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-black text-sm">{teacher.name}</p>
              <p className="text-[10px] text-muted-foreground">{teacher.subject?.name || "غير محدد"}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "subject",
      header: "المادة",
      cell: ({ row }) => {
        const subject = row.original.subject;
        return (
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{subject?.name || "غير محدد"}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "rating",
      header: "التقييم",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
          <span className="font-bold">{row.original.rating || 0}</span>
        </div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "تاريخ الانضمام",
      cell: ({ row }) => (
        <span className="text-sm">
          {new Date(row.original.createdAt).toLocaleDateString("ar-EG")}
        </span>
      ),
    },
    {
      id: "actions",
      header: "الإجراءات",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => toast.info("تعديل المعلم قريباً")}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <Edit className="h-4 w-4 text-blue-500" />
          </button>
          <button
            onClick={() => setDeleteDialog({ open: true, id: row.original.id })}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-10 pb-20" dir="rtl">
      <PageHeader
        title="إدارة المعلمين 👨‍🏫"
        description="إدارة جميع المعلمين في المنصة وربطهم بالمواد الدراسية."
      >
        <div className="flex items-center gap-3">
          <AdminButton
            variant="outline"
            icon={Search}
            onClick={() => toast.info("البحث المتقدم قريباً")}
            className="rounded-2xl"
          >
            بحث
          </AdminButton>
          <AdminButton
            variant="premium"
            icon={UserPlus}
            onClick={() => toast.info("إضافة معلم جديد قريباً")}
            className="rounded-2xl shadow-xl"
          >
            إضافة معلم
          </AdminButton>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AdminStatsCard
          title="إجمالي المعلمين"
          value={data?.data?.pagination?.total || 0}
          icon={GraduationCap}
          color="blue"
          description="معلم في المنصة"
        />
        <AdminStatsCard
          title="المعلمين النشطين"
          value="0"
          icon={Users}
          color="green"
          description="هذا الأسبوع"
        />
        <AdminStatsCard
          title="متوسط التقييم"
          value="4.5"
          icon={Star}
          color="yellow"
          description="تقييم عام"
        />
      </div>

      <div className="admin-glass p-1 rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
        <AdminDataTable
          columns={columns}
          data={data?.data?.teachers || []}
          loading={isLoading}
          searchKey="name"
          searchPlaceholder="ابحث عن معلم..."
          serverSide
          totalRows={data?.data?.pagination?.total || 0}
          pageCount={data?.data?.pagination?.totalPages || 1}
          currentPage={page}
          onPageChange={setPage}
          pageSize={limit}
          onPageSizeChange={setLimit}
          actions={{
            onRefresh: () => refetch(),
          }}
        />
      </div>

      <AdminConfirm
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: null })}
        title="حذف معلم"
        description="هل أنت متأكد من حذف هذا المعلم؟ سيتم إزالة بياناته من النظام."
        confirmText="تأكيد الحذف"
        variant="destructive"
        onConfirm={() => {
          if (deleteDialog.id) {
            deleteMutation.mutate(deleteDialog.id);
          }
        }}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}