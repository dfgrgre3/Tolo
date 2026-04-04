"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminDataTable } from "@/components/admin/ui/admin-table";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { AdminCard } from "@/components/admin/ui/admin-card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Edit, Trash2, Calendar, Users } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { TableSkeleton } from "@/components/admin/ui/loading-skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { SearchInput } from "@/components/admin/ui/admin-input";
import { logger } from '@/lib/logger';

interface Event {
  id: string;
  title: string;
  description: string | null;
  type: string;
  startDate: string;
  endDate: string;
  location: string | null;
  isOnline: boolean;
  maxAttendees: number | null;
  createdAt: string;
  _count: {
    attendees: number;
  };
}

const eventSchema = z.object({
  title: z.string().min(1, "عنوان الحدث مطلوب"),
  description: z.string().optional(),
  type: z.string().min(1, "النوع مطلوب"),
  startDate: z.string().min(1, "تاريخ البداية مطلوب"),
  endDate: z.string().min(1, "تاريخ النهاية مطلوب"),
  location: z.string().optional(),
  isOnline: z.boolean(),
  maxAttendees: z.number().nullable(),
});

type EventFormValues = z.infer<typeof eventSchema>;

const eventTypes = [
  { value: "workshop", label: "ورشة عمل" },
  { value: "webinar", label: "ندوة عبر الإنترنت" },
  { value: "competition", label: "مسابقة" },
  { value: "lecture", label: "محاضرة" },
  { value: "other", label: "أخرى" },
];

export default function AdminEventsPage() {
  const [events, setEvents] = React.useState<Event[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingEvent, setEditingEvent] = React.useState<Event | null>(null);
  const [deleteDialog, setDeleteDialog] = React.useState<{
    open: boolean;
    id: string | null;
  }>({ open: false, id: null });
  const [search, setSearch] = React.useState("");

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "workshop",
      startDate: "",
      endDate: "",
      location: "",
      isOnline: true,
      maxAttendees: null,
    },
  });

  const fetchEvents = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/events?limit=100");
      const data = await response.json();
      setEvents(data.data?.events || []);
    } catch (error) {
      logger.error("Error fetching events:", error);
      toast.error("حدث خطأ أثناء جلب الأحداث");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleOpenDialog = (event?: Event) => {
    if (event) {
      setEditingEvent(event);
      form.reset({
        title: event.title,
        description: event.description || "",
        type: event.type,
        startDate: event.startDate.split("T")[0],
        endDate: event.endDate.split("T")[0],
        location: event.location || "",
        isOnline: event.isOnline,
        maxAttendees: event.maxAttendees,
      });
    } else {
      setEditingEvent(null);
      form.reset({
        title: "",
        description: "",
        type: "workshop",
        startDate: "",
        endDate: "",
        location: "",
        isOnline: true,
        maxAttendees: null,
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (values: EventFormValues) => {
    try {
      const url = "/api/admin/events";
      const method = editingEvent ? "PATCH" : "POST";
      const body = editingEvent ? { ...values, id: editingEvent.id } : values;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(editingEvent ? "تم تحديث الحدث بنجاح" : "تم إنشاء الحدث بنجاح");
        setDialogOpen(false);
        fetchEvents();
      } else {
        toast.error("حدث خطأ أثناء حفظ الحدث");
      }
    } catch (error) {
      logger.error("Error saving event:", error);
      toast.error("حدث خطأ أثناء حفظ الحدث");
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;

    try {
      const response = await fetch("/api/admin/events", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteDialog.id }),
      });

      if (response.ok) {
        toast.success("تم حذف الحدث بنجاح");
        fetchEvents();
      } else {
        toast.error("حدث خطأ أثناء حذف الحدث");
      }
    } catch (error) {
      logger.error("Error deleting event:", error);
      toast.error("حدث خطأ أثناء حذف الحدث");
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  const typeLabels: Record<string, string> = {
    GENERAL: "عام",
    WORKSHOP: "ورشة عمل",
    LECTURE: "محاضرة",
    COMPETITION: "مسابقة",
  };

  const filteredEvents = React.useMemo(() => {
    if (!search) return events;
    const query = search.toLowerCase();
    return events.filter((event) => event.title.toLowerCase().includes(query));
  }, [events, search]);

  const columns: ColumnDef<Event>[] = [
    {
      accessorKey: "title",
      header: "الحدث",
      cell: ({ row }) => {
        const event = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <Calendar className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="font-medium">{event.title}</p>
              <p className="text-sm text-muted-foreground">
                {event.isOnline ? "أونلاين" : event.location || "غير محدد"}
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
        const type = row.getValue("type") as string;
        return (
          <Badge variant="outline">
            {typeLabels[type] || type}
          </Badge>
        );
      },
    },
    {
      accessorKey: "startDate",
      header: "البداية",
      cell: ({ row }) => {
        const date = row.getValue("startDate") as string;
        return new Date(date).toLocaleDateString("ar-EG");
      },
    },
    {
      accessorKey: "endDate",
      header: "النهاية",
      cell: ({ row }) => {
        const date = row.getValue("endDate") as string | null;
        return date ? new Date(date).toLocaleDateString("ar-EG") : "-";
      },
    },
    {
      id: "attendees",
      header: "الحضور",
      cell: ({ row }) => {
        const event = row.original;
        return (
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{event._count.attendees}</span>
            {event.maxAttendees && (
              <span className="text-muted-foreground">/{event.maxAttendees}</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "تاريخ الإنشاء",
      cell: ({ row }) => {
        const date = row.getValue("createdAt") as string;
        return new Date(date).toLocaleDateString("ar-EG");
      },
    },
    {
      id: "actions",
      header: "الإجراءات",
      cell: ({ row }) => {
        const event = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <AdminButton variant="ghost" size="icon-sm">
                <MoreHorizontal className="h-4 w-4" />
              </AdminButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleOpenDialog(event)}>
                <Edit className="ml-2 h-4 w-4" />
                تعديل
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setDeleteDialog({ open: true, id: event.id })}
              >
                <Trash2 className="ml-2 h-4 w-4" />
                حذف
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-8 pb-20" dir="rtl">
      <PageHeader
        title="إدارة الأحداث"
        description="عرض وإدارة جميع الأحداث في الموقع"
        badge={`${events.length} حدث`}
      >
        <AdminButton onClick={() => handleOpenDialog()} icon={Plus}>
          إضافة حدث
        </AdminButton>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <AdminCard className="space-y-2 p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">إجمالي الأحداث</p>
          <p className="text-3xl font-black">{events.length}</p>
        </AdminCard>
        <AdminCard className="space-y-2 p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">إجمالي الحضور</p>
          <p className="text-3xl font-black">{events.reduce((sum, event) => sum + event._count.attendees, 0)}</p>
        </AdminCard>
        <AdminCard className="space-y-2 p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">فعاليات أونلاين</p>
          <p className="text-3xl font-black">{events.filter((event) => event.isOnline).length}</p>
        </AdminCard>
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={7} />
      ) : (
        <AdminDataTable
          columns={columns}
          data={filteredEvents}
          actions={{ onRefresh: fetchEvents }}
          toolbar={
            <SearchInput
              placeholder="البحث عن حدث..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-72"
            />
          }
        />
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? "تعديل الحدث" : "إضافة حدث جديد"}
            </DialogTitle>
            <DialogDescription>
              أدخل بيانات الحدث
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>عنوان الحدث *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الوصف</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>النوع *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر النوع" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {eventTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تاريخ البداية *</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تاريخ النهاية *</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الموقع</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="isOnline"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <FormLabel>عبر الإنترنت</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxAttendees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الحد الأقصى للحضور</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          placeholder="غير محدود"
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <AdminButton type="submit">
                  {editingEvent ? "تحديث" : "إنشاء"}
                </AdminButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: null })}
        title="حذف الحدث"
        description="هل أنت متأكد من حذف هذا الحدث؟"
        confirmText="حذف"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
