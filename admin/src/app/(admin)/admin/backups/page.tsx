"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Database,
  Download,
  RefreshCw,
  Trash2,
  Upload,
  CheckCircle,
  AlertCircle,
  Clock,
  Calendar,
  HardDrive,
  Shield,
  Play,
  RotateCcw,
  FileArchive,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { apiRoutes } from "@/lib/api/routes";
import { adminFetch } from "@/lib/api/admin-api";
import { m } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

interface Backup {
  id: string;
  name: string;
  size: number;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "VERIFIED";
  type: "FULL" | "INCREMENTAL" | "DIFFERENTIAL";
  createdAt: string;
  completedAt: string | null;
  tables: string[];
  checksum: string | null;
  storageLocation: string;
  progress?: number;
  errorMessage?: string | null;
}

const statusConfig = {
  PENDING: { label: "معلّق", color: "text-gray-500", bgColor: "bg-gray-500/10 border-gray-500/20", icon: Clock },
  IN_PROGRESS: { label: "قيد التنفيذ", color: "text-blue-500", bgColor: "bg-blue-500/10 border-blue-500/20", icon: RefreshCw },
  COMPLETED: { label: "مكتمل", color: "text-emerald-500", bgColor: "bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle },
  FAILED: { label: "فاشل", color: "text-red-500", bgColor: "bg-red-500/10 border-red-500/20", icon: AlertCircle },
  VERIFIED: { label: "تم التحقق", color: "text-purple-500", bgColor: "bg-purple-500/10 border-purple-500/20", icon: Shield },
};

const typeConfig = {
  FULL: { label: "كامل", color: "bg-blue-500/20 text-blue-600" },
  INCREMENTAL: { label: "تزايدي", color: "bg-amber-500/20 text-amber-600" },
  DIFFERENTIAL: { label: "تفاضلي", color: "bg-purple-500/20 text-purple-600" },
};

export default function AdminBackupsPage() {
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = React.useState(false);
  const [selectedBackup, setSelectedBackup] = React.useState<Backup | null>(null);
  const [backupType, setBackupType] = React.useState<"FULL" | "INCREMENTAL" | "DIFFERENTIAL">("FULL");
  const [selectedTables, setSelectedTables] = React.useState<string[]>([]);
  const [progressMap, setProgressMap] = React.useState<Record<string, number>>({});

  const { data: backups = [], isLoading, refetch } = useQuery({
    queryKey: ["admin", "backups"],
    queryFn: async () => {
      const res = await adminFetch(apiRoutes.admin.backups);
      if (!res.ok) throw new Error("Failed to fetch backups");
      const json = await res.json();
      return (json.data || json) as Backup[];
    },
    refetchInterval: 5000, // Poll every 5 seconds for progress updates
  });

  const { data: tables = [] } = useQuery({
    queryKey: ["admin", "backups", "tables"],
    queryFn: async () => {
      const res = await adminFetch(`${apiRoutes.admin.backups}/tables`);
      if (!res.ok) throw new Error("Failed to fetch tables");
      const json = await res.json();
      return json.data || json;
    },
  });

  const createMutation = useMutation({
    mutationFn: async ({ type, tables }: { type: string; tables?: string[] }) => {
      const res = await adminFetch(apiRoutes.admin.backups, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, tables }),
      });
      if (!res.ok) throw new Error("Failed to create backup");
      return res.json();
    },
    onSuccess: () => {
      toast.success("تم بدء إنشاء النسخة الاحتياطية");
      setCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "backups"] });
    },
    onError: () => {
      toast.error("فشل في إنشاء النسخة الاحتياطية");
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await adminFetch(`${apiRoutes.admin.backups}/${id}/restore`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to restore backup");
      return res.json();
    },
    onSuccess: () => {
      toast.success("تم بدء استعادة النسخة الاحتياطية");
      setRestoreDialogOpen(false);
      setSelectedBackup(null);
    },
    onError: () => {
      toast.error("فشل في استعادة النسخة الاحتياطية");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await adminFetch(`${apiRoutes.admin.backups}/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete backup");
      return res.json();
    },
    onSuccess: () => {
      toast.success("تم حذف النسخة الاحتياطية");
      queryClient.invalidateQueries({ queryKey: ["admin", "backups"] });
    },
    onError: () => {
      toast.error("فشل في حذف النسخة الاحتياطية");
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await adminFetch(`${apiRoutes.admin.backups}/${id}/verify`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to verify backup");
      return res.json();
    },
    onSuccess: () => {
      toast.success("تم التحقق من النسخة الاحتياطية");
      queryClient.invalidateQueries({ queryKey: ["admin", "backups"] });
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await adminFetch(`${apiRoutes.admin.backups}/${id}/download`);
      if (!res.ok) throw new Error("Failed to download backup");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-${id}.sql`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast.success("تم بدء التنزيل");
    },
  });

  const stats = {
    total: backups.length,
    totalSize: backups.reduce((sum, b) => sum + (b.size || 0), 0),
    completed: backups.filter((b) => b.status === "COMPLETED" || b.status === "VERIFIED").length,
    failed: backups.filter((b) => b.status === "FAILED").length,
    inProgress: backups.filter((b) => b.status === "IN_PROGRESS").length,
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const handleCreateBackup = () => {
    createMutation.mutate({
      type: backupType,
      tables: selectedTables.length > 0 ? selectedTables : undefined,
    });
  };

  const columns: ColumnDef<Backup>[] = [
    {
      accessorKey: "name",
      header: "النسخة الاحتياطية",
      cell: ({ row }) => {
        const backup = row.original;
        return (
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-primary/10 text-primary border border-primary/20">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <p className="font-black text-sm">{backup.name}</p>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                {formatSize(backup.size)}
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
        const config = typeConfig[row.original.type];
        return (
          <Badge className={`font-black text-[10px] ${config.color} border-0`}>
            {config.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "status",
      header: "الحالة",
      cell: ({ row }) => {
        const backup = row.original;
        const config = statusConfig[backup.status];
        const Icon = config.icon;

        return (
          <div className="space-y-2">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${config.bgColor}`}>
              <Icon className={`w-3.5 h-3.5 ${config.color}`} />
              <span className={`text-[10px] font-black uppercase tracking-widest ${config.color}`}>
                {config.label}
              </span>
            </div>
            {backup.status === "IN_PROGRESS" && (
              <Progress value={backup.progress || progressMap[backup.id] || 0} className="h-1 w-24" />
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "tables",
      header: "الجداول",
      cell: ({ row }) => {
        const tables = row.original.tables;
        if (!tables || tables.length === 0) return <span className="text-muted-foreground text-xs">كل الجداول</span>;
        return (
          <div className="flex flex-wrap gap-1 max-w-[150px]">
            {tables.slice(0, 3).map((t, i) => (
              <Badge key={i} variant="outline" className="text-[9px] font-bold">
                {t}
              </Badge>
            ))}
            {tables.length > 3 && (
              <Badge variant="outline" className="text-[9px] font-bold">+{tables.length - 3}</Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "تاريخ الإنشاء",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-xs font-bold">
            {new Date(row.original.createdAt).toLocaleDateString("ar-EG")}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(row.original.createdAt, { addSuffix: true })}
          </span>
        </div>
      ),
    },
    {
      id: "actions",
      header: "التحكم",
      cell: ({ row }) => {
        const backup = row.original;
        const canDownload = backup.status === "COMPLETED" || backup.status === "VERIFIED";
        const canVerify = backup.status === "COMPLETED";
        const canRestore = backup.status === "COMPLETED" || backup.status === "VERIFIED";
        
        return (
          <RowActions
            row={backup}
            extraActions={[
              ...(canDownload ? [{
                icon: Download,
                label: "تحميل",
                onClick: (b: Backup) => downloadMutation.mutate(b.id),
              }] : []),
              ...(canVerify ? [{
                icon: Shield,
                label: "التحقق",
                onClick: (b: Backup) => verifyMutation.mutate(b.id),
              }] : []),
              ...(canRestore ? [{
                icon: RotateCcw,
                label: "استعادة",
                onClick: (b: Backup) => {
                  setSelectedBackup(b);
                  setRestoreDialogOpen(true);
                },
              }] : []),
            ]}
            onDelete={(b) => deleteMutation.mutate(b.id)}
          />
        );
      },
    },
  ];

  return (
    <div className="space-y-10 pb-20" dir="rtl">
      <PageHeader
        title="إدارة النسخ الاحتياطية 💾"
        description="إنشاء وإدارة واستعادة نسخ قاعدة البيانات الاحتياطية."
      >
        <div className="flex items-center gap-3">
          <AdminButton variant="outline" icon={RefreshCw} onClick={() => refetch()}>
            تحديث
          </AdminButton>
          <AdminButton
            variant="premium"
            icon={Upload}
            onClick={() => setCreateDialogOpen(true)}
            className="shadow-xl"
          >
            نسخة احتياطية جديدة
          </AdminButton>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <AdminStatsCard
          title="إجمالي النسخ"
          value={stats.total}
          icon={FileArchive}
          color="blue"
          description="نسخة احتياطية"
        />
        <AdminStatsCard
          title="الحجم الإجمالي"
          value={formatSize(stats.totalSize)}
          icon={HardDrive}
          color="purple"
          description="مساحة مستخدمة"
        />
        <AdminStatsCard
          title="مكتملة"
          value={stats.completed}
          icon={CheckCircle}
          color="green"
          description="نسخة صالحة"
        />
        <AdminStatsCard
          title="فاشلة"
          value={stats.failed}
          icon={AlertCircle}
          color="red"
          description="تحتاج مراجعة"
        />
        <AdminStatsCard
          title="قيد التنفيذ"
          value={stats.inProgress}
          icon={RefreshCw}
          color="yellow"
          description="جاري الآن"
        />
      </div>

      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="admin-glass p-1 rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl"
      >
        <AdminDataTable
          columns={columns}
          data={backups}
          loading={isLoading}
          searchKey="name"
          searchPlaceholder="ابحث في النسخ الاحتياطية..."
          actions={{ onRefresh: () => refetch() }}
        />
      </m.div>

      {/* Create Backup Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg bg-card/90 backdrop-blur-xl border-white/10 rounded-[2rem] p-0 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500" />
          <div className="p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-xl font-black flex items-center gap-3">
                <Database className="w-6 h-6 text-primary" />
                إنشاء نسخة احتياطية جديدة
              </DialogTitle>
              <DialogDescription className="font-bold text-muted-foreground">
                اختر نوع النسخة الاحتياطية والجداول المراد تضمينها.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div>
                <label className="font-black text-[10px] uppercase tracking-widest opacity-60 mb-2 block">
                  نوع النسخة الاحتياطية
                </label>
                <Select value={backupType} onValueChange={(v) => setBackupType(v as any)}>
                  <SelectTrigger className="h-12 rounded-xl border-white/10 bg-white/5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-white/10">
                    <SelectItem value="FULL" className="font-bold">كامل (جميع الجداول)</SelectItem>
                    <SelectItem value="INCREMENTAL" className="font-bold">تزايدي (التغييرات فقط)</SelectItem>
                    <SelectItem value="DIFFERENTIAL" className="font-bold">تفاضلي (منذ آخر كامل)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {backupType !== "FULL" && (
                <div>
                  <label className="font-black text-[10px] uppercase tracking-widest opacity-60 mb-2 block">
                    الجداول (اختياري - اتركه فارغاً لجميع الجداول)
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 rounded-xl border border-white/10 bg-white/5">
                    {tables.map((table: string) => (
                      <label key={table} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTables.includes(table)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTables([...selectedTables, table]);
                            } else {
                              setSelectedTables(selectedTables.filter((t) => t !== table));
                            }
                          }}
                          className="rounded border-white/20"
                        />
                        <span className="font-medium">{table}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="mt-6">
              <AdminButton
                onClick={handleCreateBackup}
                loading={createMutation.isPending}
                icon={Play}
                className="w-full h-12"
              >
                بدء النسخ الاحتياطي
              </AdminButton>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent className="max-w-md bg-card/90 backdrop-blur-xl border-white/10 rounded-[2rem] p-0 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500" />
          <div className="p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-xl font-black flex items-center gap-3 text-red-500">
                <RotateCcw className="w-6 h-6" />
                استعادة نسخة احتياطية
              </DialogTitle>
              <DialogDescription className="font-bold text-muted-foreground">
                سيتم استبدال البيانات الحالية بالبيانات من النسخة الاحتياطية:
                <br />
                <span className="font-black text-foreground mt-2 block">{selectedBackup?.name}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 mb-6">
              <div className="flex items-center gap-2 text-red-500">
                <AlertCircle className="w-5 h-5" />
                <span className="font-black text-sm">تحذير!</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                هذه العملية لا يمكن التراجع عنها. تأكد من إنشاء نسخة احتياطية للبيانات الحالية أولاً.
              </p>
            </div>

            <DialogFooter>
              <AdminButton
                variant="destructive"
                onClick={() => selectedBackup && restoreMutation.mutate(selectedBackup.id)}
                loading={restoreMutation.isPending}
                icon={RotateCcw}
                className="w-full h-12"
              >
                تأكيد الاستعادة
              </AdminButton>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
