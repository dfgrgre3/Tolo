"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/ui/page-header";
import { DataTable } from "@/components/admin/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { MoreHorizontal, Plus, Edit, Trash2, Trophy, Download, Upload, Target } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { TableSkeleton } from "@/components/admin/ui/loading-skeleton";

interface Subject {
  id: string;
  name: string;
  nameAr: string | null;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: string;
  category: string;
  xpReward: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  difficulty: string;
  createdAt: string;
  subject: {
    id: string;
    name: string;
    nameAr: string | null;
  } | null;
  _count: {
    completions: number;
  };
}

const challengeSchema = z.object({
  title: z.string().min(1, "عنوان التحدي مطلوب"),
  description: z.string().min(1, "وصف التحدي مطلوب"),
  type: z.string().min(1, "النوع مطلوب"),
  category: z.string().min(1, "الفئة مطلوبة"),
  xpReward: z.number().min(0, "المكافأة يجب أن تكون صفر أو أكثر"),
  startDate: z.string().min(1, "تاريخ البداية مطلوب"),
  endDate: z.string().min(1, "تاريخ النهاية مطلوب"),
  difficulty: z.string().min(1, "مستوى الصعوبة مطلوب"),
  subjectId: z.string().optional(),
  isActive: z.boolean(),
});

type ChallengeFormValues = z.infer<typeof challengeSchema>;

const challengeTypes = [
  { value: "daily", label: "يومي" },
  { value: "weekly", label: "أسبوعي" },
  { value: "monthly", label: "شهري" },
  { value: "special", label: "خاص" },
];

const difficultyOptions = [
  { value: "EASY", label: "سهل" },
  { value: "MEDIUM", label: "متوسط" },
  { value: "HARD", label: "صعب" },
  { value: "EXPERT", label: "خبير" },
];

export default function AdminChallengesPage() {
  const [challenges, setChallenges] = React.useState<Challenge[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingChallenge, setEditingChallenge] = React.useState<Challenge | null>(null);
  const [deleteDialog, setDeleteDialog] = React.useState<{
    open: boolean;
    id: string | null;
  }>({ open: false, id: null });

  const form = useForm<ChallengeFormValues>({
    resolver: zodResolver(challengeSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "daily",
      category: "",
      xpReward: 10,
      startDate: "",
      endDate: "",
      difficulty: "EASY",
      subjectId: "",
      isActive: true,
    },
  });

  const fetchChallenges = React.useCallback(async () => {
    setLoading(true);
    try {
      const [challengesRes, subjectsRes] = await Promise.all([
        fetch("/api/admin/challenges"),
        fetch("/api/admin/subjects?limit=100"),
      ]);
      const challengesData = await challengesRes.json();
      const subjectsData = await subjectsRes.json();
      setChallenges(challengesData.challenges);
      setSubjects(subjectsData.subjects);
    } catch (error) {
      console.error("Error fetching challenges:", error);
      toast.error("حدث خطأ أثناء جلب التحديات");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  const handleOpenDialog = (challenge?: Challenge) => {
    if (challenge) {
      setEditingChallenge(challenge);
      form.reset({
        title: challenge.title,
        description: challenge.description,
        type: challenge.type,
        category: challenge.category,
        xpReward: challenge.xpReward,
        startDate: challenge.startDate.split("T")[0],
        endDate: challenge.endDate.split("T")[0],
        difficulty: challenge.difficulty,
        subjectId: challenge.subject?.id || "",
        isActive: challenge.isActive,
      });
    } else {
      setEditingChallenge(null);
      form.reset({
        title: "",
        description: "",
        type: "daily",
        category: "",
        xpReward: 10,
        startDate: "",
        endDate: "",
        difficulty: "EASY",
        subjectId: "",
        isActive: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (values: ChallengeFormValues) => {
    try {
      const url = "/api/admin/challenges";
      const method = editingChallenge ? "PATCH" : "POST";
      const body = editingChallenge ? { ...values, id: editingChallenge.id } : values;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(editingChallenge ? "تم تحديث التحدي بنجاح" : "تم إنشاء التحدي بنجاح");
        setDialogOpen(false);
        fetchChallenges();
      } else {
        toast.error("حدث خطأ أثناء حفظ التحدي");
      }
    } catch (error) {
      console.error("Error saving challenge:", error);
      toast.error("حدث خطأ أثناء حفظ التحدي");
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;

    try {
      const response = await fetch("/api/admin/challenges", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteDialog.id }),
      });

      if (response.ok) {
        toast.success("تم حذف التحدي بنجاح");
        fetchChallenges();
      } else {
        toast.error("حدث خطأ أثناء حذف التحدي");
      }
    } catch (error) {
      console.error("Error deleting challenge:", error);
      toast.error("حدث خطأ أثناء حذف التحدي");
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  const handleExport = () => {
    const exportData = challenges.map((challenge) => ({
      title: challenge.title,
      description: challenge.description,
      type: challenge.type,
      category: challenge.category,
      xpReward: challenge.xpReward,
      startDate: challenge.startDate,
      endDate: challenge.endDate,
      difficulty: challenge.difficulty,
      isActive: challenge.isActive,
      subjectId: challenge.subject?.id || null,
    }));
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `challenges-${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    toast.success("تم تصدير التحديات بنجاح");
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (!Array.isArray(imported)) {
          throw new Error("الملف يجب أن يحتوي على مصفوفة من التحديات");
        }
        
        // Import each challenge
        let importedCount = 0;
        for (const challenge of imported) {
          try {
            const response = await fetch("/api/admin/challenges", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(challenge),
            });
            if (response.ok) importedCount++;
          } catch {
            // Skip failed imports
          }
        }
        
        toast.success(`تم استيراد ${importedCount} تحدي بنجاح`);
        fetchChallenges();
      } catch {
        toast.error("فشل في قراءة ملف التحديات");
      }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  };

  const difficultyColors: Record<string, string> = {
    EASY: "bg-green-500",
    MEDIUM: "bg-yellow-500",
    HARD: "bg-orange-500",
    EXPERT: "bg-red-500",
  };

  const difficultyLabels: Record<string, string> = {
    EASY: "سهل",
    MEDIUM: "متوسط",
    HARD: "صعب",
    EXPERT: "خبير",
  };

  const columns: ColumnDef<Challenge>[] = [
    {
      accessorKey: "title",
      header: "التحدي",
      cell: ({ row }) => {
        const challenge = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
              <Trophy className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="font-medium">{challenge.title}</p>
              <p className="text-sm text-muted-foreground">{challenge.type}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "category",
      header: "الفئة",
    },
    {
      accessorKey: "xpReward",
      header: "المكافأة",
      cell: ({ row }) => {
        const xp = row.getValue("xpReward") as number;
        return <span className="font-medium">{xp} XP</span>;
      },
    },
    {
      accessorKey: "difficulty",
      header: "الصعوبة",
      cell: ({ row }) => {
        const difficulty = row.getValue("difficulty") as string;
        return (
          <Badge className={`${difficultyColors[difficulty]} text-white`}>
            {difficultyLabels[difficulty] || difficulty}
          </Badge>
        );
      },
    },
    {
      accessorKey: "isActive",
      header: "الحالة",
      cell: ({ row }) => {
        const isActive = row.getValue("isActive") as boolean;
        return (
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "نشط" : "معطل"}
          </Badge>
        );
      },
    },
    {
      id: "completions",
      header: "المشاركين",
      cell: ({ row }) => {
        const challenge = row.original;
        return <span>{challenge._count.completions} مشارك</span>;
      },
    },
    {
      accessorKey: "endDate",
      header: "ينتهي في",
      cell: ({ row }) => {
        const date = row.getValue("endDate") as string;
        return new Date(date).toLocaleDateString("ar-EG");
      },
    },
    {
      id: "actions",
      header: "الإجراءات",
      cell: ({ row }) => {
        const challenge = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleOpenDialog(challenge)}>
                <Edit className="ml-2 h-4 w-4" />
                تعديل
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setDeleteDialog({ open: true, id: challenge.id })}
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
    <div className="space-y-6">
      <PageHeader
        title="إدارة التحديات"
        description="عرض وإدارة جميع التحديات في الموقع"
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="ml-2 h-4 w-4" />
            تصدير
          </Button>
          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Button variant="outline" size="sm">
              <Upload className="ml-2 h-4 w-4" />
              استيراد
            </Button>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="ml-2 h-4 w-4" />
            إضافة تحدي
          </Button>
        </div>
      </PageHeader>

      {loading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : (
        <DataTable
          columns={columns}
          data={challenges}
          searchKey="title"
          searchPlaceholder="البحث عن تحدي..."
        />
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingChallenge ? "تعديل التحدي" : "إضافة تحدي جديد"}
            </DialogTitle>
            <DialogDescription>
              أدخل بيانات التحدي
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>عنوان التحدي *</FormLabel>
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
                    <FormLabel>الوصف *</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
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
                          {challengeTypes.map((type) => (
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
                <FormField
                  control={form.control}
                  name="difficulty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الصعوبة *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر الصعوبة" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {difficultyOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الفئة *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="xpReward"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>مكافأة XP *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="subjectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المادة (اختياري)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر المادة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.nameAr || subject.name}
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
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <FormLabel>نشط</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit">
                  {editingChallenge ? "تحديث" : "إنشاء"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: null })}
        title="حذف التحدي"
        description="هل أنت متأكد من حذف هذا التحدي؟"
        confirmText="حذف"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
