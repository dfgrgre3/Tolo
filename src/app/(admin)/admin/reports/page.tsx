"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminCard } from "@/components/admin/ui/admin-card";
import { AdminButton } from "@/components/admin/ui/admin-button";
import {
  FileDown,
  Columns,
  Coins,
  TrendingUp,
  TrendingDown,
  WalletCards,
  CalendarCheck,
  CheckCircle2,
  TableProperties
} from "lucide-react";
import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Column = {
  id: string;
  label: string;
  selected: boolean;
};

const AVAILABLE_COLUMNS: Column[] = [
  { id: "col_id", label: "الرقم التعريفي (ID)", selected: true },
  { id: "col_name", label: "اسم المحارب", selected: true },
  { id: "col_email", label: "البريد الإلكتروني", selected: true },
  { id: "col_phone", label: "رقم الهاتف", selected: false },
  { id: "col_xp", label: "نقاط الخبرة (XP)", selected: true },
  { id: "col_level", label: "المستوى القتالي", selected: true },
  { id: "col_grade", label: "الـ Grade/الصف", selected: false },
  { id: "col_payments", label: "إجمالي المدفوعات", selected: false },
  { id: "col_last_login", label: "آخر تسجيل دخول", selected: false },
  { id: "col_exams", label: "الاختبارات المجتازة", selected: false },
];

export default function ReportsPage() {
  const [columns, setColumns] = React.useState<Column[]>(AVAILABLE_COLUMNS);
  const [exportType, setExportType] = React.useState("pdf");
  const [isGenerating, setIsGenerating] = React.useState(false);

  // Financial Mock Data
  const financialMetrics = {
    mrr: "$4,520",
    growth: "+14.5%",
    churnRate: "2.1%",
    totalUsers: 1450,
    paidUsers: 320,
    overdue: 15
  };

  const toggleColumn = (id: string) => {
    setColumns(columns.map(c => c.id === id ? { ...c, selected: !c.selected } : c));
  };

  const selectedCount = columns.filter(c => c.selected).length;

  const handleExport = () => {
    if (selectedCount === 0) {
      toast.error("يجب اختيار عمود واحد على الأقل للتصدير");
      return;
    }
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      toast.success(`تم استخراج التقرير بصيغة ${exportType.toUpperCase()} ويحمل ختم المنصة بنجاح.`);
    }, 2000);
  };

  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        title="مركز التقارير المتقدمة والخزانة المالية"
        description="استخراج تقارير ديناميكية لجيش المحاربين، ومراقبة مؤشرات الأداء الحيوية (MRR & Churn) ونمو الخزانة."
      >
        <div className="flex bg-accent rounded-xl p-1 border">
          <div className="px-4 py-2 bg-background shadow-sm rounded-lg text-sm font-bold flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-500" />
            الباقة الاحترافية
          </div>
        </div>
      </PageHeader>

      {/* Financial Dashboard Section */}
      <h2 className="text-xl font-black flex items-center gap-2 mt-8">
        <WalletCards className="w-5 h-5 text-emerald-500" />
        الخزانة المالية والاشتراكات (Financials)
      </h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <AdminCard variant="glass" className="p-5 border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
          <p className="text-sm font-bold text-muted-foreground flex items-center justify-between">
            الإيراد المتكرر (MRR)
            <span className="text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md text-xs">{financialMetrics.growth}</span>
          </p>
          <div className="mt-4 flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{financialMetrics.mrr}</h3>
            <span className="text-sm font-bold text-muted-foreground">/ شهر</span>
          </div>
          <p className="text-xs text-muted-foreground mt-4 font-medium flex items-center gap-1">
             <TrendingUp className="w-3 h-3 text-emerald-500" />
             نمو مستقر ومبشر للمعسكر
          </p>
        </AdminCard>

        <AdminCard variant="glass" className="p-5 border-red-500/20">
          <p className="text-sm font-bold text-muted-foreground flex items-center justify-between">
            معدل التسرب (Churn Rate)
          </p>
          <div className="mt-4 flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-red-500">{financialMetrics.churnRate}</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-4 font-medium flex items-center gap-1">
             <TrendingDown className="w-3 h-3 text-red-500" />
             انخفض التسرب بنسبة 0.5% هذا الأسبوع
          </p>
        </AdminCard>

        <AdminCard variant="glass" className="p-5 border-blue-500/20">
          <p className="text-sm font-bold text-muted-foreground flex items-center justify-between">
            المحاربون المميزون (المدفوع)
          </p>
          <div className="mt-4 flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-blue-500">{financialMetrics.paidUsers}</h3>
            <span className="text-sm font-bold text-muted-foreground">من {financialMetrics.totalUsers}</span>
          </div>
          <div className="w-full bg-border/50 h-1.5 rounded-full mt-4 overflow-hidden">
            <div className="bg-blue-500 h-full" style={{ width: `${(financialMetrics.paidUsers / financialMetrics.totalUsers) * 100}%` }}></div>
          </div>
        </AdminCard>

        <AdminCard variant="glass" className="p-5 border-orange-500/20">
          <p className="text-sm font-bold text-muted-foreground flex items-center justify-between">
            مدفوعات متأخرة
          </p>
          <div className="mt-4 flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-orange-500">{financialMetrics.overdue}</h3>
            <span className="text-sm font-bold text-muted-foreground">طلاب</span>
          </div>
          <p className="text-xs text-muted-foreground mt-4 font-medium flex items-center gap-1">
             <CalendarCheck className="w-3 h-3 text-orange-500" />
             بانتظار التحصيل الذكي للمتبقي
          </p>
        </AdminCard>
      </div>

      {/* Custom Report Builder Section */}
      <h2 className="text-xl font-black flex items-center gap-2 mt-12 mb-4">
        <TableProperties className="w-5 h-5 text-primary" />
        مُنشئ التقارير المخصص (Custom Builder)
      </h2>
      
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Column Selection */}
        <div className="lg:col-span-2">
          <AdminCard variant="glass" className="p-0 overflow-hidden border-border/50 shadow-sm">
             <div className="p-6 bg-accent/20 border-b border-border/50">
               <h3 className="font-bold text-lg flex items-center gap-2">
                 <Columns className="w-5 h-5 text-primary" />
                 حدد استراتيجية التقرير (الأعمدة المطلوبة)
               </h3>
               <p className="text-sm text-muted-foreground mt-1">
                 اضغط على الأعمدة لتضمينها في التقرير الديناميكي الخاص بك.
               </p>
             </div>
             
             <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {columns.map(col => (
                    <motion.div 
                      key={col.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => toggleColumn(col.id)}
                      className={`
                        p-4 rounded-xl border-2 cursor-pointer flex items-center gap-3 transition-colors
                        ${col.selected 
                          ? 'border-primary bg-primary/5 shadow-sm' 
                          : 'border-border/60 bg-background hover:border-primary/40'}
                      `}
                    >
                      <div className={`
                         flex h-6 w-6 shrink-0 items-center justify-center rounded-full border
                         ${col.selected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted'}
                      `}>
                         {col.selected && <CheckCircle2 className="h-4 w-4" />}
                      </div>
                      <span className={`font-bold text-sm ${col.selected ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {col.label}
                      </span>
                    </motion.div>
                  ))}
                </div>
             </div>
          </AdminCard>
        </div>

        {/* Export Options Panel */}
        <div className="space-y-6">
           <AdminCard variant="glass" className="p-6 border-border/50 sticky top-6">
              <h3 className="font-black text-lg mb-6 border-b pb-4">إعدادات النشر والتصدير</h3>
              
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">صيغة الملف</label>
                  <Select value={exportType} onValueChange={setExportType}>
                    <SelectTrigger className="w-full h-12 rounded-xl text-right font-bold bg-accent/30 border-none ring-1 ring-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">ملف حبر احترافي (PDF)</SelectItem>
                      <SelectItem value="xlsx">جدول بيانات (Excel / XLSX)</SelectItem>
                      <SelectItem value="csv">بيانات خام (CSV)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4 pt-4 border-t">
                   <div className="flex items-center justify-between">
                     <span className="text-sm font-bold text-muted-foreground">شعار المنصة الرسمي</span>
                     <Switch defaultChecked />
                   </div>
                   <div className="flex items-center justify-between">
                     <span className="text-sm font-bold text-muted-foreground">إحصائيات إجمالية بالأسفل</span>
                     <Switch defaultChecked />
                   </div>
                   <div className="flex items-center justify-between">
                     <span className="text-sm font-bold text-muted-foreground">تشفير الملف بكلمة مرور</span>
                     <Switch />
                   </div>
                </div>

                <div className="pt-6">
                  <div className="flex justify-between text-xs font-bold mb-3 px-1 text-muted-foreground">
                    <span>الأعمدة العسكرية الجاهزة</span>
                    <span className="text-primary">{selectedCount} أعمدة</span>
                  </div>
                  
                  <AdminButton 
                    className="w-full h-14 rounded-2xl text-lg font-black uppercase tracking-widest gap-2 shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all"
                    onClick={handleExport}
                    loading={isGenerating}
                    icon={FileDown}
                  >
                    توليد وتنزيل التقرير
                  </AdminButton>
                </div>
              </div>
           </AdminCard>
        </div>
      </div>
    </div>
  );
}
