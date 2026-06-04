"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminDataTable, RowActions } from "@/components/admin/ui/admin-table";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { AdminStatsCard } from "@/components/admin/ui/admin-card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Ticket,
  Search,
  MessageCircle,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Send,
  User,
  RefreshCw,
  FileText,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { apiRoutes } from "@/lib/api/routes";
import { adminFetch } from "@/lib/api/admin-api";
import { m } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { arSA } from "date-fns/locale/ar-SA";
import { useTicketRealtime } from "@/hooks/use-admin-realtime";

interface TicketModel {
  id: string;
  title: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  category: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  assignedTo: string | null;
  user?: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
  };
  messages?: {
    id: string;
    content: string;
    createdAt: string;
    userId: string;
    user?: {
      name: string | null;
    };
  }[];
}

const statusConfig = {
  OPEN: { label: "مفتوح", icon: Ticket, color: "text-blue-500", bgColor: "bg-blue-500/10 border-blue-500/20" },
  IN_PROGRESS: { label: "قيد المعالجة", icon: Clock, color: "text-amber-500", bgColor: "bg-amber-500/10 border-amber-500/20" },
  RESOLVED: { label: "تم الحل", icon: CheckCircle, color: "text-emerald-500", bgColor: "bg-emerald-500/10 border-emerald-500/20" },
  CLOSED: { label: "مغلق", icon: XCircle, color: "text-gray-500", bgColor: "bg-gray-500/10 border-gray-500/20" },
};

const priorityConfig = {
  LOW: { label: "منخفض", color: "text-blue-500" },
  MEDIUM: { label: "متوسط", color: "text-yellow-500" },
  HIGH: { label: "عالي", color: "text-orange-500" },
  URGENT: { label: "عاجل", color: "text-red-500" },
};

export default function AdminTicketsPage() {
  const queryClient = useQueryClient();
  const [selectedTicket, setSelectedTicket] = React.useState<TicketModel | null>(null);
  const [replyDialogOpen, setReplyDialogOpen] = React.useState(false);
  const [replyMessage, setReplyMessage] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [priorityFilter, setPriorityFilter] = React.useState<string>("all");

  const { isConnected: isWsConnected } = useTicketRealtime(
    () => {
      refetch();
      toast.info("تذكرة جديدة وصلت!");
    },
    () => {
      refetch();
    }
  );

  const { data: queryData, isLoading, refetch } = useQuery({
    queryKey: ["admin", "tickets", statusFilter, priorityFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (priorityFilter !== "all") params.set("priority", priorityFilter);
      
      const res = await adminFetch(`${apiRoutes.admin.tickets}?${params}`);
      if (!res.ok) throw new Error("Failed to fetch tickets");
      const json = await res.json();
      const data = json.data || json;
      if (data && typeof data === "object" && Array.isArray(data.tickets)) {
        return data.tickets as TicketModel[];
      }
      return (Array.isArray(data) ? data : []) as TicketModel[];
    },
  });

  const tickets = React.useMemo(() => {
    if (!queryData) return [];
    if (Array.isArray(queryData)) return queryData;
    if (typeof queryData === "object") {
      const rawData = (queryData as any).data || queryData;
      if (rawData && typeof rawData === "object" && Array.isArray(rawData.tickets)) {
        return rawData.tickets as TicketModel[];
      }
      if (Array.isArray(rawData)) {
        return rawData as TicketModel[];
      }
    }
    return [];
  }, [queryData]);

  const replyMutation = useMutation({
    mutationFn: async ({ id, message }: { id: string; message: string }) => {
      const res = await adminFetch(`${apiRoutes.admin.tickets}/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: message }),
      });
      if (!res.ok) throw new Error("Failed to send reply");
      return res.json();
    },
    onSuccess: () => {
      toast.success("تم إرسال الرد بنجاح");
      setReplyMessage("");
      setReplyDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "tickets"] });
    },
    onError: () => {
      toast.error("فشل في إرسال الرد");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await adminFetch(`${apiRoutes.admin.tickets}/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      toast.success("تم تحديث الحالة");
      queryClient.invalidateQueries({ queryKey: ["admin", "tickets"] });
    },
  });

  const stats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === "OPEN").length,
    inProgress: tickets.filter((t) => t.status === "IN_PROGRESS").length,
    resolved: tickets.filter((t) => t.status === "RESOLVED").length,
    urgent: tickets.filter((t) => t.priority === "URGENT").length,
  };

  const handleReply = () => {
    if (!selectedTicket || !replyMessage.trim()) return;
    replyMutation.mutate({ id: selectedTicket.id, message: replyMessage });
  };

  const columns: ColumnDef<TicketModel>[] = [
    {
      accessorKey: "user",
      header: "المستخدم",
      cell: ({ row }) => {
        const user = row.original.user;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 border border-primary/20">
              <AvatarImage src={user?.avatar || ""} />
              <AvatarFallback className="font-bold bg-primary/10 text-primary text-xs">
                {user?.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-black text-xs">{user?.name || "مستخدم"}</p>
              <p className="text-[10px] text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "title",
      header: "الموضوع",
      cell: ({ row }) => (
        <div className="max-w-[200px]">
          <p className="font-bold text-sm truncate">{row.original.title}</p>
          <p className="text-[10px] text-muted-foreground truncate">
            {row.original.category}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "الحالة",
      cell: ({ row }) => {
        const config = statusConfig[row.original.status] || statusConfig.OPEN;
        const Icon = config.icon;
        return (
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${config.bgColor}`}>
            <Icon className={`w-3.5 h-3.5 ${config.color}`} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${config.color}`}>
              {config.label}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "priority",
      header: "الأولوية",
      cell: ({ row }) => {
        const config = priorityConfig[row.original.priority];
        return (
          <Badge variant="outline" className={`font-black text-[10px] ${config.color} border-current`}>
            {config.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "تاريخ الإنشاء",
      cell: ({ row }) => (
        <span className="text-[10px] text-muted-foreground font-bold">
          {formatDistanceToNow(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "التحكم",
      cell: ({ row }) => (
        <RowActions
          row={row.original}
          onEdit={(ticket) => {
            setSelectedTicket(ticket);
            setReplyDialogOpen(true);
          }}
          extraActions={[
            {
              icon: CheckCircle,
              label: "تحديد كمحلول",
              onClick: (ticket) => updateStatusMutation.mutate({ id: ticket.id, status: "RESOLVED" }),
            },
            {
              icon: XCircle,
              label: "إغلاق التذكرة",
              onClick: (ticket) => updateStatusMutation.mutate({ id: ticket.id, status: "CLOSED" }),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-10 pb-20" dir="rtl">
      <PageHeader
        title="نظام تذاكر الدعم الفني 🎫"
        description="إدارة ومراقبة جميع طلبات الدعم الفني والاستفسارات من المستخدمين."
      >
        <div className="flex items-center gap-3">
          <AdminButton variant="outline" icon={RefreshCw} onClick={() => refetch()}>
            تحديث
          </AdminButton>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <AdminStatsCard
          title="إجمالي التذاكر"
          value={stats.total}
          icon={FileText}
          color="blue"
          description="تذكرة في النظام"
        />
        <AdminStatsCard
          title="مفتوحة"
          value={stats.open}
          icon={Ticket}
          color="yellow"
          description="تنتظر المعالجة"
        />
        <AdminStatsCard
          title="قيد المعالجة"
          value={stats.inProgress}
          icon={Clock}
          color="purple"
          description="يتم العمل عليها"
        />
        <AdminStatsCard
          title="تم الحل"
          value={stats.resolved}
          icon={CheckCircle}
          color="green"
          description="تم إغلاقها بنجاح"
        />
        <AdminStatsCard
          title="عاجلة"
          value={stats.urgent}
          icon={AlertCircle}
          color="red"
          description="تتطلب اهتمام فوري"
        />
      </div>

      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="admin-glass p-1 rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl"
      >
        <AdminDataTable
          columns={columns}
          data={tickets}
          loading={isLoading}
          searchKey="title"
          searchPlaceholder="ابحث في التذاكر..."
          actions={{ onRefresh: () => refetch() }}
          toolbar={
            <div className="flex items-center gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 h-10 rounded-xl bg-accent/10 border-border text-xs font-black">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-white/10">
                  <SelectItem value="all" className="font-bold">كل الحالات</SelectItem>
                  <SelectItem value="OPEN" className="font-bold text-blue-500">مفتوح</SelectItem>
                  <SelectItem value="IN_PROGRESS" className="font-bold text-amber-500">قيد المعالجة</SelectItem>
                  <SelectItem value="RESOLVED" className="font-bold text-emerald-500">تم الحل</SelectItem>
                  <SelectItem value="CLOSED" className="font-bold text-gray-500">مغلق</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-36 h-10 rounded-xl bg-accent/10 border-border text-xs font-black">
                  <SelectValue placeholder="الأولوية" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-white/10">
                  <SelectItem value="all" className="font-bold">كل الأولويات</SelectItem>
                  <SelectItem value="LOW" className="font-bold text-blue-500">منخفض</SelectItem>
                  <SelectItem value="MEDIUM" className="font-bold text-yellow-500">متوسط</SelectItem>
                  <SelectItem value="HIGH" className="font-bold text-orange-500">عالي</SelectItem>
                  <SelectItem value="URGENT" className="font-bold text-red-500">عاجل</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        />
      </m.div>

      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent className="max-w-2xl bg-card/90 backdrop-blur-xl border-white/10 rounded-[2rem] p-0 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500" />
          <div className="p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-xl font-black flex items-center gap-3">
                <MessageCircle className="w-6 h-6 text-primary" />
                الرد على التذكرة
              </DialogTitle>
              <DialogDescription className="font-bold text-muted-foreground">
                {selectedTicket?.title}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedTicket?.messages?.map((msg) => (
                <div key={msg.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-bold">{msg.user?.name || "مستخدم"}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(msg.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm">{msg.content}</p>
                </div>
              ))}
              <Textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="اكتب ردك هنا..."
                className="min-h-[120px] rounded-xl border-white/10 bg-white/5 font-medium"
              />
            </div>
            <DialogFooter className="mt-6">
              <AdminButton
                onClick={handleReply}
                loading={replyMutation.isPending}
                icon={Send}
                className="w-full h-12"
              >
                إرسال الرد
              </AdminButton>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

