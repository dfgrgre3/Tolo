"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/ui/page-header";
import { DataTable } from "@/components/admin/ui/data-table";
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
import { ColumnDef } from "@tanstack/react-table";
import { Calendar, Filter, Search, Shield, User, Monitor, AlertTriangle, Info } from "lucide-react";

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
  LOGIN: "تسجيل دخول",
  LOGOUT: "تسجيل خروج",
  REGISTER: "تسجيل جديد",
  PASSWORD_CHANGE: "تغيير كلمة المرور",
  EMAIL_CHANGE: "تغيير البريد الإلكتروني",
  PROFILE_UPDATE: "تحديث الملف الشخصي",
  FAILED_LOGIN: "محاولة دخول فاشلة",
  SUSPICIOUS_ACTIVITY: "نشاط مشبوه",
  ACCOUNT_LOCKED: "قفل الحساب",
  ACCOUNT_UNLOCKED: "إلغاء قفل الحساب",
  TWO_FACTOR_ENABLED: "تفعيل التحقق الثنائي",
  TWO_FACTOR_DISABLED: "تعطيل التحقق الثنائي",
  SESSION_EXPIRED: "انتهاء الجلسة",
  API_ACCESS: "وصول API",
};

const eventTypeColors: Record<string, string> = {
  LOGIN: "bg-green-500",
  LOGOUT: "bg-gray-500",
  REGISTER: "bg-blue-500",
  PASSWORD_CHANGE: "bg-yellow-500",
  EMAIL_CHANGE: "bg-yellow-500",
  PROFILE_UPDATE: "bg-blue-500",
  FAILED_LOGIN: "bg-red-500",
  SUSPICIOUS_ACTIVITY: "bg-red-500",
  ACCOUNT_LOCKED: "bg-red-500",
  ACCOUNT_UNLOCKED: "bg-green-500",
  TWO_FACTOR_ENABLED: "bg-purple-500",
  TWO_FACTOR_DISABLED: "bg-orange-500",
  SESSION_EXPIRED: "bg-gray-500",
  API_ACCESS: "bg-indigo-500",
};

const eventTypeIcons: Record<string, React.ElementType> = {
  LOGIN: User,
  LOGOUT: User,
  REGISTER: User,
  PASSWORD_CHANGE: Shield,
  EMAIL_CHANGE: Shield,
  PROFILE_UPDATE: User,
  FAILED_LOGIN: AlertTriangle,
  SUSPICIOUS_ACTIVITY: AlertTriangle,
  ACCOUNT_LOCKED: AlertTriangle,
  ACCOUNT_UNLOCKED: Shield,
  TWO_FACTOR_ENABLED: Shield,
  TWO_FACTOR_DISABLED: Shield,
  SESSION_EXPIRED: Monitor,
  API_ACCESS: Monitor,
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
      setLogs(data.logs);
      setEventTypes(data.eventTypes);
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
      header: "التاريخ والوقت",
      cell: ({ row }) => {
        const date = row.getValue("createdAt") as string;
        return (
          <div className="text-sm">
            <p>{new Date(date).toLocaleDateString("ar-EG")}</p>
            <p className="text-muted-foreground">
              {new Date(date).toLocaleTimeString("ar-EG")}
            </p>
          </div>
        );
      },
    },
    {
      accessorKey: "user",
      header: "المستخدم",
      cell: ({ row }) => {
        const log = row.original;
        if (!log.user) {
          return (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                <Info className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-muted-foreground">غير معروف</span>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={log.user.avatar || undefined} />
              <AvatarFallback>
                {log.user.name?.charAt(0) || log.user.email.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{log.user.name || "بدون اسم"}</p>
              <p className="text-xs text-muted-foreground">{log.user.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "eventType",
      header: "نوع الحدث",
      cell: ({ row }) => {
        const eventType = row.getValue("eventType") as string;
        const Icon = eventTypeIcons[eventType] || Info;
        return (
          <Badge className={`${eventTypeColors[eventType] || "bg-gray-500"} text-white`}>
            <Icon className="ml-1 h-3 w-3" />
            {eventTypeLabels[eventType] || eventType}
          </Badge>
        );
      },
    },
    {
      accessorKey: "ip",
      header: "IP",
      cell: ({ row }) => {
        const ip = row.getValue("ip") as string;
        return (
          <code className="text-xs bg-muted px-2 py-1 rounded" dir="ltr">
            {ip}
          </code>
        );
      },
    },
    {
      accessorKey: "location",
      header: "الموقع",
      cell: ({ row }) => {
        const location = row.getValue("location") as string | null;
        return location || "-";
      },
    },
    {
      accessorKey: "deviceInfo",
      header: "الجهاز",
      cell: ({ row }) => {
        const deviceInfo = row.getValue("deviceInfo") as string | null;
        if (!deviceInfo) return "-";
        return (
          <span className="text-xs text-muted-foreground truncate max-w-[150px] block">
            {deviceInfo}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="سجل النظام"
        description="سجل جميع الأنشطة والأحداث الأمنية"
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="البحث بمعرف المستخدم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-9"
          />
        </div>
        <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
          <SelectTrigger className="w-48">
            <Filter className="ml-2 h-4 w-4" />
            <SelectValue placeholder="فلترة حسب النوع" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            {eventTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {eventTypeLabels[type] || type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => {
          setEventTypeFilter("all");
          setSearchQuery("");
        }}>
          إعادة تعيين
        </Button>
      </div>

      {/* Data Table */}
      {loading ? (
        <div className="space-y-4 animate-in fade-in duration-500">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border rounded-xl" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 bg-muted animate-pulse rounded" />
                <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
              </div>
              <div className="h-6 w-20 bg-muted animate-pulse rounded-full" />
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={logs}
          searchKey="ip"
          searchPlaceholder="البحث عن IP..."
        />
      )}
    </div>
  );
}
