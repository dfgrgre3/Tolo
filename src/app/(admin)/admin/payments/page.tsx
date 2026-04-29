"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminDataTable } from "@/components/admin/ui/admin-table";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { AdminStatsCard } from "@/components/admin/ui/admin-card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CreditCard,
  DollarSign,
  Download,
  RefreshCw,
  Search,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowUpRight,
  Banknote,
  Receipt,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { m } from "framer-motion";
import { toast } from "sonner";
import { exportToCSV, ExportColumn } from "@/lib/export-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Payment {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
  method: string | null;
  transactionId: string | null;
  subjectId: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
  };
  subject?: {
    id: string;
    name: string;
    nameAr: string | null;
  } | null;
}

interface PaymentsResponse {
  data: {
    payments: Payment[];
    summary: {
      totalPayments: number;
      totalRevenue: number;
      completedCount: number;
      pendingCount: number;
      failedCount: number;
    };
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

const statusConfig: Record<
  string,
  { label: string; icon: React.ElementType; color: string; bgColor: string }
> = {
  PENDING: {
    label: "قيد المعالجة",
    icon: Clock,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10 border-amber-500/20",
  },
  COMPLETED: {
    label: "مكتملة",
    icon: CheckCircle,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10 border-emerald-500/20",
  },
  FAILED: {
    label: "فاشلة",
    icon: XCircle,
    color: "text-red-500",
    bgColor: "bg-red-500/10 border-red-500/20",
  },
  REFUNDED: {
    label: "مستردة",
    icon: AlertCircle,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10 border-purple-500/20",
  },
};

export default function AdminPaymentsPage() {
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const deferredSearch = React.useDeferredValue(search);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin", "payments", page, limit, deferredSearch, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (deferredSearch) params.set("search", deferredSearch);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const response = await fetch(`/api/admin/payments?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch payments");
      return (await response.json()) as PaymentsResponse;
    },
  });

  React.useEffect(() => {
    setPage(1);
  }, [deferredSearch, statusFilter]);

  const payments = data?.data?.payments || [];
  const summary = data?.data?.summary || {
    totalPayments: 0,
    totalRevenue: 0,
    completedCount: 0,
    pendingCount: 0,
    failedCount: 0,
  };
  const pagination = data?.data?.pagination;

  const handleExport = () => {
    if (!payments.length) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }
    const exportColumns: ExportColumn<Payment>[] = [
      { header: "رقم العملية", accessor: (p) => p.transactionId || p.id },
      { header: "المستخدم", accessor: (p) => p.user?.name || p.user?.email || "غير معروف" },
      { header: "المبلغ", accessor: (p) => `${p.amount} ${p.currency}` },
      { header: "الحالة", accessor: (p) => statusConfig[p.status]?.label || p.status },
      { header: "طريقة الدفع", accessor: (p) => p.method || "غير محدد" },
      {
        header: "المادة/الدورة",
        accessor: (p) => p.subject?.nameAr || p.subject?.name || "-",
      },
      {
        header: "التاريخ",
        accessor: (p) => new Date(p.createdAt).toLocaleDateString("ar-EG"),
      },
    ];
    exportToCSV(payments, exportColumns, "payments");
    toast.success("تم التصدير بنجاح");
  };

  const columns: ColumnDef<Payment>[] = [
    {
      accessorKey: "transactionId",
      header: "رقم العملية",
      cell: ({ row }) => {
        const payment = row.original;
        return (
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.1)] transition-transform hover:scale-105">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <p className="font-mono font-black text-xs tracking-tight">
                {payment.transactionId ? payment.transactionId.slice(0, 12) + "..." : payment.id.slice(0, 8)}
              </p>
              <p className="text-[10px] text-muted-foreground font-bold opacity-60">
                {new Date(payment.createdAt).toLocaleDateString("ar-EG")} •{" "}
                {new Date(payment.createdAt).toLocaleTimeString("ar-EG", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "user",
      header: "المستخدم",
      cell: ({ row }) => {
        const user = row.original.user;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 border border-primary/20">
              <AvatarImage src={user?.avatar || ""} />
              <AvatarFallback className="font-bold bg-primary/10 text-primary text-[10px]">
                {user?.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-black text-xs">{user?.name || "مستخدم"}</p>
              <p className="text-[10px] text-muted-foreground font-bold opacity-60 italic">
                {user?.email || ""}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "amount",
      header: "المبلغ",
      cell: ({ row }) => (
        <span className="font-black text-emerald-500 text-sm flex items-center gap-1">
          <Banknote className="w-3.5 h-3.5" />
          {row.original.amount.toLocaleString()} {row.original.currency || "EGP"}
        </span>
      ),
    },
    {
      accessorKey: "subject",
      header: "الدورة/المادة",
      cell: ({ row }) => {
        const subject = row.original.subject;
        return subject ? (
          <Badge
            variant="outline"
            className="font-black text-[10px] uppercase px-3 py-1 rounded-lg bg-white/5 border-primary/20 text-primary"
          >
            {subject.nameAr || subject.name}
          </Badge>
        ) : (
          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-50">
            عام
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "الحالة",
      cell: ({ row }) => {
        const config = statusConfig[row.original.status] || statusConfig.PENDING;
        const StatusIcon = config.icon;
        return (
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${config.bgColor}`}>
            <StatusIcon className={`w-3.5 h-3.5 ${config.color}`} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${config.color}`}>
              {config.label}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "method",
      header: "طريقة الدفع",
      cell: ({ row }) => (
        <span className="text-xs font-bold text-muted-foreground">
          {row.original.method || "غير محدد"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-10 pb-20" dir="rtl">
      <PageHeader
        title="إدارة المدفوعات والمعاملات 💳"
        description="مراقبة وإدارة جميع المعاملات المالية، المدفوعات، والاستردادات في المنصة."
      >
        <div className="flex items-center gap-3">
          <AdminButton variant="outline" icon={Download} onClick={handleExport}>
            تصدير CSV
          </AdminButton>
          <AdminButton variant="outline" icon={RefreshCw} onClick={() => refetch()} loading={isFetching}>
            تحديث
          </AdminButton>
        </div>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <AdminStatsCard
          title="إجمالي المعاملات"
          value={summary.totalPayments}
          icon={CreditCard}
          color="blue"
          description="عملية مالية مسجلة"
        />
        <AdminStatsCard
          title="إجمالي الإيرادات"
          value={summary.totalRevenue}
          icon={DollarSign}
          color="green"
          description="ج.م تم تحصيلها"
        />
        <AdminStatsCard
          title="معاملات مكتملة"
          value={summary.completedCount}
          icon={CheckCircle}
          color="green"
          description="تمت بنجاح"
        />
        <AdminStatsCard
          title="قيد المعالجة"
          value={summary.pendingCount}
          icon={Clock}
          color="yellow"
          description="تنتظر الإتمام"
        />
        <AdminStatsCard
          title="معاملات فاشلة"
          value={summary.failedCount}
          icon={XCircle}
          color="red"
          description="لم تكتمل"
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
          data={payments}
          loading={isLoading}
          serverSide
          totalRows={pagination?.total || 0}
          pageCount={pagination?.totalPages || 1}
          currentPage={page}
          onPageChange={setPage}
          onPageSizeChange={setLimit}
          pageSize={limit}
          actions={{ onRefresh: () => refetch() }}
          toolbar={
            <div className="flex items-center gap-3">
              <div className="relative group">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث بالاسم أو البريد..."
                  className="h-10 w-64 rounded-xl border border-border bg-accent/10 px-10 text-sm outline-none ring-primary transition focus:ring-1 font-bold"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 h-10 rounded-xl bg-accent/10 border-border text-xs font-black">
                  <SelectValue placeholder="كل الحالات" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-white/10">
                  <SelectItem value="all" className="font-bold">كل الحالات</SelectItem>
                  <SelectItem value="COMPLETED" className="font-bold text-emerald-500">مكتملة</SelectItem>
                  <SelectItem value="PENDING" className="font-bold text-amber-500">قيد المعالجة</SelectItem>
                  <SelectItem value="FAILED" className="font-bold text-red-500">فاشلة</SelectItem>
                  <SelectItem value="REFUNDED" className="font-bold text-purple-500">مستردة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        />
      </m.div>
    </div>
  );
}
