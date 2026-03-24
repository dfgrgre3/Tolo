"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminDataTable } from "@/components/admin/ui/admin-table";
import { AdminCard } from "@/components/admin/ui/admin-card";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { 
  AlertCircle, CheckCircle2, 
  Book, FileText, Video, Eye, RefreshCw,
  Flag, ShieldAlert, History, Target
} from "lucide-react";

import { ColumnDef } from "@tanstack/react-table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface ContentReport {
  id: string;
  targetId: string;
  targetType: string;
  issueType: string;
  description: string;
  status: string;
  adminNote?: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
  subject?: {
    nameAr: string;
    name: string;
  };
}

export default function ContentReportsPage() {
  const queryClient = useQueryClient();
  const [selectedReport, setSelectedReport] = React.useState<ContentReport | null>(null);
  const [resolutionNote, setResolutionNote] = React.useState("");
  const [isNoteOpen, setIsNoteOpen] = React.useState(false);

  const { data: reports = [], isLoading, refetch } = useQuery({
    queryKey: ["admin", "content-reports"],
    queryFn: async () => {
      const res = await fetch("/api/admin/reports/content");
      const result = await res.json();
      return (result.data || []) as ContentReport[];
    }
  });

  const updateReportMutation = useMutation({
    mutationFn: async ({ id, status, adminNote }: { id: string, status: string, adminNote?: string }) => {
      const res = await fetch("/api/admin/reports/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, adminNote }),
      });
      if (!res.ok) throw new Error("Failed to update report");
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["admin", "content-reports"] });
      setIsNoteOpen(false);
      setSelectedReport(null);
    },
    onError: () => toast.error("فشل في تحديث بلاغ المحتوى")
  });

  const handleResolve = (report: ContentReport) => {
    setSelectedReport(report);
    setResolutionNote(report.adminNote || "");
    setIsNoteOpen(true);
  };

  const columns: ColumnDef<ContentReport>[] = [
    {
      accessorKey: "issueType",
      header: "نوع البلاغ",
      cell: ({ row }) => {
        const type = row.original.issueType;
        const target = row.original.targetType;
        const Icons: Record<string, any> = { VIDEO: Video, EXAM: Target, LESSON: Book, BOOK: FileText };
        const Icon = Icons[target] || Flag;
        
        return (
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl border ${type === 'ERROR' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
               <Icon className="w-5 h-5" />
            </div>
            <div>
               <p className="font-black text-xs uppercase tracking-tight">{type === 'ERROR' ? 'خطأ علمي' : 'خطأ تقني / إملائي'}</p>
               <span className="text-[10px] opacity-60 font-bold">{target}</span>
            </div>
          </div>
        );
      }
    },
    {
       accessorKey: "description",
       header: "وصف البلاء / المشكلة",
       cell: ({ row }) => <p className="text-xs font-bold truncate max-w-[250px]">{row.original.description}</p>
    },
    {
      accessorKey: "status",
      header: "حالة الطلب",
      cell: ({ row }) => {
        const status = row.original.status;
        const variants: Record<string, string> = {
          PENDING: "bg-amber-500/10 text-amber-500 border-amber-500/20",
          RESOLVED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
          DISMISSED: "bg-slate-500/10 text-slate-500 border-slate-500/20",
          INVESTIGATING: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        };
        const labels: Record<string, string> = {
          PENDING: "انتظار المعالجة",
          RESOLVED: "تم الحل ✓",
          DISMISSED: "بلاغ غير دقيق",
          INVESTIGATING: "قيد المراجعة",
        };
        return (
          <Badge className={`rounded-xl px-2 py-0.5 text-[9px] font-black border uppercase ${variants[status]}`}>
            {labels[status]}
          </Badge>
        );
      }
    },
    {
      accessorKey: "user",
      header: "المبلغ",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-xs font-black">{row.original.user.name}</span>
          <span className="text-[10px] text-muted-foreground opacity-70 italic whitespace-nowrap">{new Date(row.original.createdAt).toLocaleString("ar-EG")}</span>
        </div>
      )
    },
    {
      id: "actions",
      header: "إدارة",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
           <AdminButton size="sm" variant="outline" icon={Eye} onClick={() => handleResolve(row.original)} className="rounded-xl h-8 text-[10px] font-black">
              التفاصيل
           </AdminButton>
           <AdminButton size="sm" variant="outline" icon={CheckCircle2} onClick={() => updateReportMutation.mutate({ id: row.original.id, status: 'RESOLVED' })} className="rounded-xl h-8 text-[10px] font-black border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/5" title="إغلاق كـ تم الحل" />
        </div>
      )
    }
  ];

  return (
    <div className="space-y-10 pb-20" dir="rtl">
      <PageHeader 
        title="مراقبة جودة المحتوى (Eagle Eye) 🦅"
        description="استقبل وصحح بلاغات الطلاب عن الأخطاء العلمية أو التقنية لضمان دقة معلومات المملكة."
      >
        <AdminButton icon={RefreshCw} variant="outline" onClick={() => refetch()} loading={isLoading}>
           تحميل البلاغات الجديدة
        </AdminButton>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         {[
           { label: "بلاغات قيد الانتظار", value: reports.filter(r => r.status === 'PENDING').length, icon: AlertCircle, color: "bg-amber-500" },
           { label: "تم حلها بنجاح", value: reports.filter(r => r.status === 'RESOLVED').length, icon: CheckCircle2, color: "bg-emerald-500" },
           { label: "نسبة الدقة (أسبوعي)", value: "92%", icon: ShieldAlert, color: "bg-blue-500" },
           { label: "إجمالي البلاغات", value: reports.length, icon: History, color: "bg-slate-500" },
         ].map((stat, i) => (
           <AdminCard key={i} variant="glass" className="p-6">
              <div className="flex items-center gap-4">
                 <div className={`p-3 rounded-2xl ${stat.color}/10 text-${stat.color.split('-')[1]}-500`}>
                    <stat.icon className="w-6 h-6" />
                 </div>
                 <div>
                    <h4 className="text-2xl font-black">{stat.value}</h4>
                    <p className="text-[10px] font-black opacity-60 uppercase tracking-widest">{stat.label}</p>
                 </div>
              </div>
           </AdminCard>
         ))}
      </div>

      <AdminDataTable 
        columns={columns}
        data={reports}
        loading={isLoading}
        searchKey="description"
        searchPlaceholder="ابحث في وصف البلاغات..."
      />

      <Dialog open={isNoteOpen} onOpenChange={setIsNoteOpen}>
        <DialogContent className="max-w-2xl bg-card border-white/10 rounded-[2rem] overflow-hidden">
           <DialogHeader dir="rtl">
              <DialogTitle className="text-2xl font-black">تفاصيل بلاغ المحتوى</DialogTitle>
              <DialogDescription className="font-bold">مراجعة البلاغ وتثبيت إجراءات الإصلاح.</DialogDescription>
           </DialogHeader>
           
           <div className="space-y-6 pt-4" dir="rtl">
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 rounded-2xl bg-muted/40 space-y-2">
                    <p className="text-[10px] font-black uppercase opacity-60">المبلغ</p>
                    <p className="font-bold">{selectedReport?.user.name}</p>
                 </div>
                 <div className="p-4 rounded-2xl bg-muted/40 space-y-2">
                    <p className="text-[10px] font-black uppercase opacity-60">تاريخ الإبلاغ</p>
                    <p className="font-bold">{selectedReport && new Date(selectedReport.createdAt).toLocaleString("ar-EG")}</p>
                 </div>
              </div>

              <div className="p-4 rounded-2xl bg-muted/40 space-y-2">
                 <p className="text-[10px] font-black uppercase opacity-60">وصف المشكلة</p>
                 <p className="font-bold leading-relaxed">{selectedReport?.description}</p>
              </div>

              <div className="space-y-3">
                 <label className="text-xs font-black uppercase opacity-60">مذكرة الإصلاح (Admin Note)</label>
                 <Textarea 
                   placeholder="أدخل ملاحظات الإصلاح أو سبب غلق البلاغ..."
                   className="rounded-xl border-white/10 min-h-[120px]"
                   value={resolutionNote}
                   onChange={e => setResolutionNote(e.target.value)}
                 />
              </div>
           </div>

           <DialogFooter className="pt-8 flex gap-3" dir="rtl">
              <AdminButton 
                className="bg-emerald-600 hover:bg-emerald-700 h-12 text-sm font-black flex-1"
                onClick={() => selectedReport && updateReportMutation.mutate({ id: selectedReport.id, status: 'RESOLVED', adminNote: resolutionNote })}
                loading={updateReportMutation.isPending}
              >
                تثبيت كـ &quot;تم الإصلاح&quot; 🏛️
              </AdminButton>
              <AdminButton 
                variant="outline"
                className="h-12 text-sm font-black border-white/10"
                onClick={() => selectedReport && updateReportMutation.mutate({ id: selectedReport.id, status: 'DISMISSED', adminNote: resolutionNote })}
              >
                تجاهل البلاغ
              </AdminButton>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
