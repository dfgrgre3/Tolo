"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminDataTable } from "@/components/admin/ui/admin-table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { ColumnDef } from "@tanstack/react-table";
import { 
  Search, Filter, Calendar, Shield, User, Globe, Activity, Terminal, 
  AlertTriangle, Monitor, Info, History, Eye, UserX, UserCheck, Key, Lock, Unlock, Mail, Scan, RefreshCw
} from "lucide-react";
import { motion } from "framer-motion";

interface AuditLog {
  id: string;
  eventType: string;
  ip: string;
  userAgent: string;
  deviceInfo: string | null;
  location: string | null;
  metadata: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
  } | null;
}

const eventTypeLabels: Record<string, string> = {
  LOGIN: "دخول المملكة",
  LOGOUT: "مغادرة المملكة",
  REGISTER: "محارب جديد",
  PASSWORD_CHANGE: "تجديد مفتاح التشفير",
  EMAIL_CHANGE: "تحديث المراسلات",
  PROFILE_UPDATE: "تعديل السيرة الذاتية",
  FAILED_LOGIN: "محاولة اختراق!",
  SUSPICIOUS_ACTIVITY: "نشاط مريب!",
  ACCOUNT_LOCKED: "قفل الحساب",
  ACCOUNT_UNLOCKED: "إعادة تفعيل",
  TWO_FACTOR_ENABLED: "تفعيل الحماية الثنائية",
  TWO_FACTOR_DISABLED: "تعطيل الحماية",
  SESSION_EXPIRED: "انتهاء مفعول الجلسة",
  API_ACCESS: "استدعاء خارجي (API)",
};

const eventTypeColors: Record<string, string> = {
  LOGIN: "bg-emerald-500",
  LOGOUT: "bg-gray-500",
  REGISTER: "bg-blue-500",
  PASSWORD_CHANGE: "bg-yellow-600",
  EMAIL_CHANGE: "bg-yellow-600",
  PROFILE_UPDATE: "bg-blue-500",
  FAILED_LOGIN: "bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.3)]",
  SUSPICIOUS_ACTIVITY: "bg-red-700 shadow-lg",
  ACCOUNT_LOCKED: "bg-red-600",
  ACCOUNT_UNLOCKED: "bg-emerald-500",
  TWO_FACTOR_ENABLED: "bg-purple-600",
  TWO_FACTOR_DISABLED: "bg-orange-600",
  SESSION_EXPIRED: "bg-gray-500",
  API_ACCESS: "bg-indigo-600",
};

const eventTypeIcons: Record<string, React.ElementType> = {
  LOGIN: UserCheck,
  LOGOUT: UserX,
  REGISTER: User,
  PASSWORD_CHANGE: Key,
  EMAIL_CHANGE: Mail,
  PROFILE_UPDATE: Scan,
  FAILED_LOGIN: AlertTriangle,
  SUSPICIOUS_ACTIVITY: AlertTriangle,
  ACCOUNT_LOCKED: Lock,
  ACCOUNT_UNLOCKED: Unlock,
  TWO_FACTOR_ENABLED: Shield,
  TWO_FACTOR_DISABLED: AlertTriangle,
  SESSION_EXPIRED: History,
  API_ACCESS: Terminal,
};

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = React.useState<AuditLog[]>([]);
  const [eventTypes, setEventTypes] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [eventTypeFilter, setEventTypeFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  const fetchLogs = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (eventTypeFilter && eventTypeFilter !== "all") params.append("eventType", eventTypeFilter);
      if (searchQuery) params.append("userId", searchQuery);

      const response = await fetch(`/api/admin/audit-logs?${params}`);
      const data = await response.json();
      setLogs(data.logs || []);
      setEventTypes(data.eventTypes || []);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setLoading(false);
    }
  }, [eventTypeFilter, searchQuery]);

  React.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const columns: ColumnDef<AuditLog>[] = [
    {
      accessorKey: "createdAt",
      header: "التوقيت الفلكي",
      cell: ({ row }) => {
        const date = row.getValue("createdAt") as string;
        return (
          <div className="text-[11px] font-bold">
            <p className="flex items-center gap-1.5"><Calendar className="w-3 h-3 text-muted-foreground" /> {new Date(date).toLocaleDateString("ar-EG")}</p>
            <p className="text-muted-foreground mt-0.5 opacity-60">
              {new Date(date).toLocaleTimeString("ar-EG")}
            </p>
          </div>
        );
      },
    },
    {
      accessorKey: "user",
      header: "المحارب / التابع",
      cell: ({ row }) => {
        const log = row.original;
        if (!log.user) {
          return (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted border border-border/50">
                <UserX className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <span className="text-[11px] font-bold text-muted-foreground/60 uppercase">مجهول الهوية</span>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-white/10 shadow-lg rounded-2xl">
              <AvatarImage src={log.user.avatar || undefined} />
              <AvatarFallback className="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black">
                {log.user.name?.charAt(0) || log.user.email.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-black text-xs tracking-tight">{log.user.name || "محارب بلا اسم"}</p>
              <p className="text-[10px] text-muted-foreground font-bold opacity-60 uppercase">{log.user.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "eventType",
      header: "طبيعة الاستدعاء",
      cell: ({ row }) => {
        const eventType = row.getValue("eventType") as string;
        const Icon = eventTypeIcons[eventType] || Info;
        return (
          <Badge className={`${eventTypeColors[eventType] || "bg-gray-500"} text-white border-none rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider`}>
            <Icon className="ml-1.5 h-3.5 w-3.5" />
            {eventTypeLabels[eventType] || eventType}
          </Badge>
        );
      },
    },
    {
      accessorKey: "ip",
      header: "إحداثيات الـ IP",
      cell: ({ row }) => (
        <code className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-md font-mono font-bold tracking-tighter opacity-80" dir="ltr">
          {row.getValue("ip")}
        </code>
      ),
    },
    {
      accessorKey: "location",
      header: "نطاق الاستدعاء",
      cell: ({ row }) => (
         <div className="flex items-center gap-1.5 text-xs font-bold opacity-70">
            <Globe className="w-3 h-3" />
            <span>{row.getValue("location") || "أرض مجهولة"}</span>
         </div>
      ),
    },
    {
      accessorKey: "deviceInfo",
      header: "العتاد المستخدم",
      cell: ({ row }) => {
        const deviceInfo = row.getValue("deviceInfo") as string | null;
        if (!deviceInfo) return <span className="text-[10px] opacity-20">---</span>;
        return (
          <div className="flex items-center gap-1.5 max-w-[150px] opacity-70">
            <Monitor className="w-3 h-3 flex-shrink-0" />
            <span className="text-[10px] font-bold truncate">
              {deviceInfo}
            </span>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-10 pb-20" dir="rtl">
      <PageHeader
        title="مخطوطة الأحداث الملكية 📜"
        description="سجل المراقبة الإمبراطوري، رصد تحركات المحاربين، وتوثيق سجلات الدخول والخروج من المملكة."
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-card/40 backdrop-blur-md p-6 rounded-[2rem] border border-white/5 shadow-xl">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            placeholder="بحث بمعرف المحارب..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-accent/20 border border-border h-11 pr-12 pl-4 rounded-xl text-sm font-bold focus:ring-1 ring-primary/50 outline-none transition-all"
          />
        </div>
        
        <div className="flex items-center gap-3">
            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger className="w-56 h-11 bg-accent/20 border-border rounded-xl font-bold">
                <Filter className="ml-2 h-4 w-4 text-primary" />
                <SelectValue placeholder="طبيعة الحدث" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-white/10">
                <SelectItem value="all" className="font-bold cursor-pointer">سجلات المملكة كافة</SelectItem>
                {eventTypes.map((type) => (
                  <SelectItem key={type} value={type} className="font-bold cursor-pointer">
                    {eventTypeLabels[type] || type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <AdminButton variant="outline" icon={RefreshCw} onClick={fetchLogs} loading={loading}>
              تحديث المخطوطة
            </AdminButton>
            
            {(eventTypeFilter !== "all" || searchQuery) && (
              <Button variant="ghost" className="font-bold text-xs hover:bg-red-500/10 hover:text-red-500" onClick={() => {
                setEventTypeFilter("all");
                setSearchQuery("");
              }}>
                نسيان الفلاتر
              </Button>
            )}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rpg-glass-light dark:rpg-glass p-1 rounded-[2.5rem] border border-white/10 overflow-hidden"
      >
        {loading ? (
          <div className="p-8 space-y-6">
             {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse opacity-50">
                   <div className="w-12 h-12 rounded-2xl bg-white/10" />
                   <div className="flex-1 space-y-2">
                      <div className="h-4 bg-white/10 w-1/4 rounded-full" />
                      <div className="h-3 bg-white/10 w-1/3 rounded-full" />
                   </div>
                   <div className="w-24 h-8 rounded-lg bg-white/10" />
                </div>
             ))}
          </div>
        ) : (
          <AdminDataTable
            columns={columns}
            data={logs}
            searchKey="ip"
            searchPlaceholder="البحث عن إحداثيات IP..."
          />
        )}
      </motion.div>
    </div>
  );
}
