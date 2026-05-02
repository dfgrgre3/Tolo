"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Users, 
  Search, 
  UserPlus, 
  Trash2, 
  Mail, 
  Calendar,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { AdminCard } from "@/components/admin/ui/admin-card";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiRoutes } from "@/lib/api/routes";
import { cn } from "@/lib/utils";

interface Enrollment {
  id: string;
  userId: string;
  subjectId: string;
  progress: number;
  enrolledAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

export default function CourseStudentsPage() {
  const params = useParams();
  const courseId = params.id as string;
  const queryClient = useQueryClient();
  
  const [search, setSearch] = React.useState("");
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = React.useState(false);
  const [userSearch, setUserSearch] = React.useState("");
  
  // Queries
  const { data: enrollmentsData, isLoading } = useQuery({
    queryKey: ["admin", "courses", courseId, "enrollments"],
    queryFn: async () => {
      const response = await fetch(`/api/admin/courses/${courseId}/enrollments`);
      if (!response.ok) throw new Error("Failed to load enrollments");
      const result = await response.json();
      return result.data?.enrollments as Enrollment[];
    },
  });

  const { data: usersData } = useQuery({
    queryKey: ["admin", "users", "search", userSearch],
    queryFn: async () => {
      if (!userSearch) return [];
      const response = await fetch(`/api/admin/users?search=${userSearch}`);
      const result = await response.json();
      return result.data?.users || result.users || [];
    },
    enabled: userSearch.length > 2,
  });

  // Mutations
  const enrollMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/admin/courses/${courseId}/enrollments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to enroll user");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("تم تسجيل الطالب في الدورة بنجاح");
      queryClient.invalidateQueries({ queryKey: ["admin", "courses", courseId, "enrollments"] });
      setIsEnrollDialogOpen(false);
      setUserSearch("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const unenrollMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/admin/courses/${courseId}/enrollments/${userId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to unenroll user");
      return response.json();
    },
    onSuccess: () => {
      toast.success("تم إلغاء تسجيل الطالب بنجاح");
      queryClient.invalidateQueries({ queryKey: ["admin", "courses", courseId, "enrollments"] });
    },
  });

  const filteredEnrollments = enrollmentsData?.filter(e => 
    e.user.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.user.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="بحث عن طالب بالاسم أو البريد..." 
            className="h-11 rounded-2xl pr-12 bg-card/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Dialog open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
          <DialogTrigger asChild>
            <AdminButton className="gap-2 rounded-2xl h-11 px-6 font-black shadow-lg shadow-primary/20">
              <UserPlus className="h-4 w-4" />
              تسجيل طالب يدوياً
            </AdminButton>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-black">تسجيل طالب جديد</DialogTitle>
              <DialogDescription className="text-xs font-bold text-muted-foreground">ابحث عن مستخدم مسجل في المنصة لإضافته لهذه الدورة.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="ابحث بالاسم أو البريد..." 
                  className="h-12 rounded-xl pr-12"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
              
              <div className="max-h-60 overflow-y-auto space-y-2">
                {usersData?.map((user: any) => (
                  <div key={user.id} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary">
                        {user.name?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-black">{user.name}</p>
                        <p className="text-[10px] text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <AdminButton 
                      size="sm" 
                      className="h-8 rounded-lg text-[10px] font-black"
                      onClick={() => enrollMutation.mutate(user.id)}
                      disabled={enrollMutation.isPending}
                    >
                      {enrollMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "تسجيل"}
                    </AdminButton>
                  </div>
                ))}
                {userSearch.length > 2 && usersData?.length === 0 && (
                  <p className="text-center py-4 text-xs font-bold text-muted-foreground">لا يوجد مستخدمين بهذا الاسم</p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <AdminCard className="overflow-hidden border-border/40">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-border/50 bg-muted/20">
                <th className="p-4 text-xs font-black uppercase tracking-wider text-muted-foreground">الطالب</th>
                <th className="p-4 text-xs font-black uppercase tracking-wider text-muted-foreground">تاريخ الاشتراك</th>
                <th className="p-4 text-xs font-black uppercase tracking-wider text-muted-foreground">التقدم</th>
                <th className="p-4 text-xs font-black uppercase tracking-wider text-muted-foreground">الحالة</th>
                <th className="p-4 text-xs font-black uppercase tracking-wider text-muted-foreground">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-4"><div className="h-10 w-40 bg-muted rounded-lg" /></td>
                    <td className="p-4"><div className="h-10 w-24 bg-muted rounded-lg" /></td>
                    <td className="p-4"><div className="h-10 w-32 bg-muted rounded-lg" /></td>
                    <td className="p-4"><div className="h-10 w-20 bg-muted rounded-lg" /></td>
                    <td className="p-4"><div className="h-10 w-10 bg-muted rounded-lg" /></td>
                  </tr>
                ))
              ) : filteredEnrollments?.map((enrollment) => (
                <tr key={enrollment.id} className="hover:bg-muted/10 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center font-black text-primary">
                        {enrollment.user.name?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-black">{enrollment.user.name}</p>
                        <p className="text-[10px] text-muted-foreground font-medium">{enrollment.user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(enrollment.enrolledAt).toLocaleDateString('ar-EG')}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="w-full max-w-[120px] space-y-1.5">
                      <div className="flex justify-between text-[10px] font-black">
                        <span>{Math.round(enrollment.progress || 0)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all",
                            enrollment.progress > 80 ? "bg-emerald-500" : "bg-primary"
                          )} 
                          style={{ width: `${enrollment.progress || 0}%` }} 
                        />
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    {enrollment.progress === 100 ? (
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 rounded-lg text-[10px] font-black">مكتمل</Badge>
                    ) : (
                      <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 rounded-lg text-[10px] font-black">قيد الدراسة</Badge>
                    )}
                  </td>
                  <td className="p-4 text-left">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <AdminButton variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                          <MoreVertical className="h-4 w-4" />
                        </AdminButton>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl border-border/50">
                        <DropdownMenuItem className="gap-2 text-xs font-bold cursor-pointer">
                          <Mail className="h-3.5 w-3.5" />
                          إرسال رسالة
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="gap-2 text-xs font-bold text-red-500 cursor-pointer"
                          onClick={() => unenrollMutation.mutate(enrollment.userId)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          إلغاء الاشتراك
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredEnrollments?.length === 0 && (
          <div className="py-20 text-center space-y-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <Users className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <div>
              <p className="text-lg font-black">لا يوجد طلاب مشتركين بعد</p>
              <p className="text-sm text-muted-foreground">لم يشترك أي طالب في هذه الدورة حتى الآن.</p>
            </div>
          </div>
        )}
      </AdminCard>
    </div>
  );
}
