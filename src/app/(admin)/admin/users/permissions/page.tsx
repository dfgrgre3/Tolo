"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminDataTable } from "@/components/admin/ui/admin-table";

import { AdminButton } from "@/components/admin/ui/admin-button";
import {
  ShieldAlert, ShieldCheck, UserCog, Save, RotateCcw } from
"lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_ROLE_PERMISSIONS, Permission } from "@/lib/permissions";
import { UserRole } from "@prisma/client";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from
"@/components/ui/dialog";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
}

export default function PermissionsPage() {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);
  const [editingPermissions, setEditingPermissions] = React.useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["admin", "staff-users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users?role=ADMIN&limit=100"); // Getting Admins for now, will filter/add others
      const admins = await res.json();

      const res2 = await fetch("/api/admin/users?role=TEACHER&limit=100");
      const teachers = await res2.json();

      const res3 = await fetch("/api/admin/users?role=MODERATOR&limit=100");
      const moderators = await res3.json();

      return [
      ...(admins.data?.users || []),
      ...(teachers.data?.users || []),
      ...(moderators.data?.users || [])] as
      User[];
    }
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ userId, permissions }: {userId: string;permissions: string[];}) => {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, permissions })
      });
      if (!res.ok) throw new Error("Failed to update permissions");
      return res.json();
    },
    onSuccess: () => {
      toast.success("تم تحديث صلاحيات المحارب بنجاح!");
      queryClient.invalidateQueries({ queryKey: ["admin", "staff-users"] });
      setIsDialogOpen(false);
    },
    onError: () => toast.error("فشل في تحديث الصلاحيات")
  });

  const handleEditPermissions = (user: User) => {
    setSelectedUser(user);
    setEditingPermissions(user.permissions || []);
    setIsDialogOpen(true);
  };

  const togglePermission = (perm: string) => {
    setEditingPermissions((prev) =>
    prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const columns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: "المحارب",
    cell: ({ row }) =>
    <div className="flex flex-col">
          <span className="font-black text-sm">{row.original.name}</span>
          <span className="text-[10px] text-muted-foreground">{row.original.email}</span>
        </div>

  },
  {
    accessorKey: "role",
    header: "الرتبة العسكرية",
    cell: ({ row }) => {
      const role = row.original.role;
      const colors: Record<string, string> = {
        ADMIN: "bg-red-500/10 text-red-500 border-red-500/20",
        TEACHER: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        MODERATOR: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
      };
      const labels: Record<string, string> = {
        ADMIN: "قائد أعلى",
        TEACHER: "قائد كتيبة",
        MODERATOR: "مراقب ملكي"
      };
      return (
        <Badge className={`rounded-full px-3 py-0.5 text-[10px] font-black uppercase ${colors[role] || ""}`}>
            {labels[role] || role}
          </Badge>);

    }
  },
  {
    accessorKey: "permissions",
    header: "الصلاحيات النشطة",
    cell: ({ row }) =>
    <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-[10px] border-white/5 opacity-60">
            {row.original.permissions?.length || 0} استثناءات
          </Badge>
          {row.original.role === "ADMIN" &&
      <Badge className="bg-amber-500/10 text-amber-500 text-[10px] font-bold border-none">كل الصلاحيات (Admin Override)</Badge>
      }
        </div>

  },
  {
    id: "actions",
    header: "إدارة",
    cell: ({ row }) =>
    <AdminButton
      size="sm"
      variant="outline"
      icon={ShieldCheck}
      onClick={() => handleEditPermissions(row.original)}
      className="rounded-xl h-8 text-[10px] font-black">
      
          تعديل الصلاحيات
        </AdminButton>

  }];


  const permissionCategories = React.useMemo(() => {
    const categories: Record<string, string[]> = {
      "الإدارة": ["dashboard:view", "analytics:view", "reports:view", "settings:view", "audit_logs:view"],
      "المستخدمين": ["users:view", "users:manage", "students:view", "teachers:view", "teachers:manage"],
      "المحتوى": ["subjects:view", "subjects:manage", "own_subjects:manage", "books:view", "books:manage", "own_books:manage", "resources:view", "resources:manage"],
      "التعليم": ["exams:view", "exams:manage", "own_exams:manage", "challenges:view", "challenges:manage", "own_challenges:manage", "contests:view", "contests:manage"],
      "المجتمع": ["blog:view", "blog:manage", "forum:view", "forum:moderate", "forum:manage", "comments:view", "comments:moderate", "events:view", "events:manage", "announcements:view", "announcements:manage"],
      "أخرى": ["achievements:view", "achievements:manage", "rewards:view", "rewards:manage", "ai:manage", "live_monitor:view", "marketing:view", "ab_testing:view"]
    };
    return categories;
  }, []);

  return (
    <div className="space-y-10 pb-20" dir="rtl">
      <PageHeader
        title="مصفوفة الصلاحيات (Kingdom Guard) âڑ”ï¸ڈ"
        description="إدارة رتب الأبطال والقادة، منح وتجريد الصلاحيات من القادة والمراقبين.">
        
        <AdminButton icon={ShieldAlert} variant="outline" className="opacity-70 group hover:opacity-100">
           إعادة تعيين كافة الرتب
        </AdminButton>
      </PageHeader>

      <AdminDataTable
        columns={columns}
        data={usersData || []}
        loading={isLoading}
        searchKey="name"
        searchPlaceholder="ابحث عن قائد أو مراقب..." />
      

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-5xl bg-card/90 backdrop-blur-2xl border-white/10 rounded-[2.5rem] overflow-hidden p-0 h-[85vh] flex flex-col">
          <DialogHeader className="p-8 border-b border-white/5 shrink-0" dir="rtl">
            <div className="flex items-center gap-6">
               <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary">
                  <UserCog className="w-8 h-8" />
               </div>
               <div>
                  <DialogTitle className="text-2xl font-black">إدارة صلاحيات: {selectedUser?.name}</DialogTitle>
                  <DialogDescription className="font-bold">يمكنك تخصيص الصلاحيات لهذا المحارب بشكل فردي فوق صلاحياته الافتراضية.</DialogDescription>
               </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-8 bg-white/[0.02]" dir="rtl">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(permissionCategories).map(([cat, perms]) =>
                <div key={cat} className="space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground border-b border-white/5 pb-2 mb-4">{cat}</h4>
                      <div className="space-y-3">
                         {perms.map((p) => {
                      const isDefault = selectedUser ? (DEFAULT_ROLE_PERMISSIONS[selectedUser.role as UserRole] || []).includes(p as Permission) : false;
                      const isActive = editingPermissions.includes(p) || isDefault;

                      const isOverride = editingPermissions.includes(p);

                      return (
                        <div key={p} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${isActive ? 'bg-primary/5 border-primary/20' : 'bg-transparent border-white/5 opacity-50'}`}>
                                  <div className="space-y-0.5">
                                     <p className="text-[10px] font-black uppercase tracking-tight">{p.replace(/:/g, ' ')}</p>
                                     {isDefault && <Badge className="bg-emerald-500/10 text-emerald-500 text-[8px] font-black border-none uppercase h-4">افتراضي (Role)</Badge>}
                                     {isOverride && !isDefault && <Badge className="bg-amber-500/10 text-amber-500 text-[8px] font-black border-none uppercase h-4">استثناء (User)</Badge>}
                                  </div>
                                  
                                  <Switch
                            checked={isActive}
                            disabled={isDefault}
                            onCheckedChange={() => togglePermission(p)}
                            title={isDefault ? "هذه الصلاحية تأتي تلقائياً مع الرتبة" : ""} />
                          
                               </div>);

                    })}
                      </div>
                   </div>
                )}
             </div>
          </div>

          <DialogFooter className="p-8 border-t border-white/5 bg-background shrink-0" dir="rtl">
             <div className="flex items-center gap-3 w-full">
                <AdminButton
                className="flex-1 h-14 rounded-2xl text-lg font-black gap-3"
                icon={Save}
                onClick={() => selectedUser && updatePermissionsMutation.mutate({ userId: selectedUser.id, permissions: editingPermissions })}
                loading={updatePermissionsMutation.isPending}>
                
                  حفظ الصلاحيات الملكية ًںڈ›ï¸ڈ
                </AdminButton>
                <AdminButton
                variant="outline"
                className="h-14 w-14 rounded-2xl border-white/10"
                icon={RotateCcw}
                onClick={() => setSelectedUser(null)} />
              
             </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}
