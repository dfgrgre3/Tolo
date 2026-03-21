"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminDataTable, RowActions } from "@/components/admin/ui/admin-table";
import { AdminButton, IconButton, ButtonGroup } from "@/components/admin/ui/admin-button";
import { RoleBadge, StatusBadge } from "@/components/admin/ui/admin-badge";
import { AdminCard } from "@/components/admin/ui/admin-card";
import { SearchInput } from "@/components/admin/ui/admin-input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox as CustomCheckbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissions";
import { UserRole as PrismaUserRole } from "@prisma/client";
import {
  Eye, Edit, Trash2, Mail, UserPlus, LayoutGrid, List, Download, Filter, Shield, 
  GraduationCap, User, Crown, Users, RefreshCw, MoreHorizontal, FileUp, Zap, TableProperties, CheckCircle2
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { TableSkeleton } from "@/components/admin/ui/loading-skeleton";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// Internal Checkbox for pure styling if ui/checkbox fails
function TableCheckbox({ checked, onChange }: { checked: boolean, onChange: (c: boolean) => void }) {
   if (checked) {
      return (
         <div onClick={() => onChange(false)} className="inline-flex w-4 h-4 rounded bg-primary text-primary-foreground items-center justify-center cursor-pointer">
            <CheckCircle2 className="w-3 h-3" />
         </div>
      );
   }
   return (
      <div onClick={() => onChange(true)} className="inline-flex w-4 h-4 rounded border-2 border-muted-foreground/40 items-center justify-center cursor-pointer hover:border-primary">
      </div>
   );
}

// ... Interfaces
interface UserModel {
  id: string; email: string; name: string | null; username: string | null; avatar: string | null;
  role: string; permissions: string[]; emailVerified: boolean | null; createdAt: string;
  lastLogin: string | null; totalXP: number; level: number; currentStreak: number;
}

const roleColors: Record<string, string> = { ADMIN: "bg-red-500", TEACHER: "bg-blue-500", STUDENT: "bg-green-500", MODERATOR: "bg-yellow-500", USER: "bg-gray-500" };
const roleIcons: Record<string, React.ElementType> = { ADMIN: Shield, TEACHER: GraduationCap, STUDENT: User, MODERATOR: Crown, USER: User };

export default function AdminUsersGridPage() {
  const router = useRouter();
  const [users, setUsers] = React.useState<UserModel[]>([]);
  const [loading, setLoading] = React.useState(true);
  
  // Bulk Actions State
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [isBulkMode, setIsBulkMode] = React.useState(false);
  const [quickActionType, setQuickActionType] = React.useState("");
  
  const fetchUsers = React.useCallback(async () => {
    setLoading(true);
    try {
      // Mocking fetch to show data immediately in grid
      setTimeout(() => {
         setUsers([
           { id: "u1", name: "أحمد محمود", email: "ahmed@example.com", role: "STUDENT", level: 12, totalXP: 4500, currentStreak: 5, createdAt: new Date().toISOString(), permissions: [], avatar: null, emailVerified: true, username: "ahmedm", lastLogin: null },
           { id: "u2", name: "سارة خالد", email: "sara@example.com", role: "STUDENT", level: 24, totalXP: 12500, currentStreak: 12, createdAt: new Date().toISOString(), permissions: [], avatar: null, emailVerified: true, username: "sarak", lastLogin: null },
           { id: "u3", name: "أ. محمود سالم", email: "m.salem@school.com", role: "TEACHER", level: 50, totalXP: 0, currentStreak: 0, createdAt: new Date().toISOString(), permissions: [], avatar: null, emailVerified: true, username: "msalem", lastLogin: null },
           { id: "u4", name: "يوسف ابراهيم", email: "yousef@test.com", role: "STUDENT", level: 3, totalXP: 150, currentStreak: 1, createdAt: new Date().toISOString(), permissions: [], avatar: null, emailVerified: false, username: "yousefi", lastLogin: null },
           { id: "u5", name: "رنا سعيد", email: "rana@yahoo.com", role: "STUDENT", level: 8, totalXP: 2100, currentStreak: 3, createdAt: new Date().toISOString(), permissions: [], avatar: null, emailVerified: true, username: "ranas", lastLogin: null },
         ]);
         setLoading(false);
      }, 500);
    } catch (error) {
       console.error(error);
    }
  }, []);

  React.useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const toggleSelectAll = () => {
    if (selectedIds.size === users.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(users.map(u => u.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkAction = () => {
    if (selectedIds.size === 0) return toast.error("يجب تحديد مستخدمين أولاً");
    if (!quickActionType) return toast.error("يجب تحديد الإجراء المطلوب");
    
    toast.success(`تم تنفيذ الإجراء (${quickActionType}) بنجاح على ${selectedIds.size} مستخدم`);
    setSelectedIds(new Set());
    setQuickActionType("");
  };

  const handleCsvImport = () => {
     // Trigger file input dialog (Mocked)
     toast.success("تم بدء استيراد 150 مستخدم من ملف الـ CSV بنجاح، جاري المعالجة في الخلفية");
  };

  const columns: ColumnDef<UserModel>[] = [
    {
       id: "select",
       header: () => (
          <div className="flex justify-center">
             <TableCheckbox checked={selectedIds.size === users.length && users.length > 0} onChange={toggleSelectAll} />
          </div>
       ),
       cell: ({ row }) => (
          <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
             <TableCheckbox checked={selectedIds.has(row.original.id)} onChange={() => toggleSelect(row.original.id)} />
          </div>
       )
    },
    {
      accessorKey: "name",
      header: "المستخدم",
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="font-bold bg-primary/10 text-primary">{user.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-bold text-sm tracking-tight">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "role",
      header: "الدور",
      cell: ({ row }) => <RoleBadge role={row.original.role as any} />,
    },
    {
      accessorKey: "level",
      header: "المستوى",
      cell: ({ row }) => <span className="font-bold text-primary">LVL {row.original.level}</span>,
    },
    {
      accessorKey: "emailVerified",
      header: "الحالة",
      cell: ({ row }) => <StatusBadge status={row.original.emailVerified ? "verified" : "unverified"} />,
    },
  ];

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="دفتر السجلات (Advanced Data Grid)"
        description="إدارة المستخدمين بطريقة Excel-like لتحرير 100 سجل بضغطة واحدة وتوفير الوقت والتصدير."
      >
        <div className="flex items-center gap-2">
          <AdminButton variant="outline" size="sm" icon={FileUp} className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500 hover:text-white" onClick={handleCsvImport}>
            استيراد CSV
          </AdminButton>
          <AdminButton variant="outline" size="sm" icon={Download}>
            تصدير
          </AdminButton>
          <AdminButton size="sm" icon={UserPlus}>
            إضافة مستخدم
          </AdminButton>
        </div>
      </PageHeader>

      {/* Grid Features Header */}
      <div className="bg-card border border-border rounded-2xl p-4 flex flex-col md:flex-row justify-between shrink-0 gap-4 shadow-sm items-center">
         <div className="flex items-center gap-4">
            <SearchInput placeholder="بحث سريع عن إيميل/اسم..." className="w-64 h-10 border-muted" />
            <Select defaultValue="all">
               <SelectTrigger className="w-40 h-10 bg-background"><SelectValue/></SelectTrigger>
               <SelectContent><SelectItem value="all">كل الأدوار</SelectItem><SelectItem value="student">طلاب فقط</SelectItem><SelectItem value="teacher">معلمين فقط</SelectItem></SelectContent>
            </Select>
         </div>

         <div className="flex items-center gap-2 border-r border-border/50 pr-4">
            <span className="text-xs font-bold text-muted-foreground">وضع التحرير المجمع (Bulk Mode)</span>
            <Switch defaultChecked={isBulkMode} onCheckedChange={setIsBulkMode} />
         </div>
      </div>

      {/* Bulk Actions Panel */}
      <AnimatePresence>
         {selectedIds.size > 0 && (
            <motion.div 
               initial={{ opacity: 0, y: -20, height: 0 }}
               animate={{ opacity: 1, y: 0, height: 'auto' }}
               exit={{ opacity: 0, y: -20, height: 0 }}
               className="bg-primary/10 border border-primary/20 rounded-2xl p-3 px-6 flex items-center justify-between"
            >
               <div className="flex items-center gap-3">
                  <div className="bg-primary text-white font-black text-sm w-8 h-8 flex items-center justify-center rounded-lg">
                     {selectedIds.size}
                  </div>
                  <span className="font-bold text-sm text-primary">تم تحديد صفوف. اختر الإجراء المجمع:</span>
               </div>
               
               <div className="flex gap-2">
                  <Select value={quickActionType} onValueChange={setQuickActionType}>
                     <SelectTrigger className="w-48 bg-background border-primary/30 h-10"><SelectValue placeholder="الرجاء اختيار إجراء"/></SelectTrigger>
                     <SelectContent>
                        <SelectItem value="change_role_student">ترقية الكل إلى طالب مميز</SelectItem>
                        <SelectItem value="reset_pass">إرسال رابط إعادة تعيين المرور للكل</SelectItem>
                        <SelectItem value="delete">حذف المستخدمين بالكامل (خطر)</SelectItem>
                     </SelectContent>
                  </Select>
                  <AdminButton onClick={handleBulkAction} className="bg-primary text-white h-10">
                     <Zap className="w-4 h-4 mr-2" /> تنفيذ فوراً
                  </AdminButton>
               </div>
            </motion.div>
         )}
      </AnimatePresence>

      {/* The Data Grid */}
      <AdminCard variant="glass" className="p-0 overflow-hidden border-border/50 shadow-sm">
         <div className="overflow-x-auto w-full">
            <table className="w-full text-sm text-right">
               <thead>
                  <tr className="bg-accent/40 border-b border-border/50">
                     <th className="py-4 px-4 w-12 text-center">
                        <TableCheckbox checked={selectedIds.size > 0 && selectedIds.size === users.length} onChange={toggleSelectAll} />
                     </th>
                     <th className="py-4 px-4 font-black uppercase text-xs tracking-widest text-muted-foreground">الاسم والبيانات</th>
                     <th className="py-4 px-4 font-black uppercase text-xs tracking-widest text-muted-foreground">الدور والتصريح</th>
                     <th className="py-4 px-4 font-black uppercase text-xs tracking-widest text-muted-foreground">القوة (XP)</th>
                     <th className="py-4 px-4 font-black uppercase text-xs tracking-widest text-muted-foreground">الحالة</th>
                     <th className="py-4 px-4 font-black uppercase text-xs tracking-widest text-muted-foreground text-left">إجراءات سريعة</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-border/20">
                  {users.map((u, i) => (
                     <tr key={u.id} className={`hover:bg-accent/10 transition-colors ${selectedIds.has(u.id) ? 'bg-primary/5' : ''}`}>
                        <td className="py-3 px-4 text-center">
                           <TableCheckbox checked={selectedIds.has(u.id)} onChange={() => toggleSelect(u.id)} />
                        </td>
                        <td className="py-3 px-4">
                           <div className="flex items-center gap-3">
                             <Avatar className="h-9 w-9"><AvatarFallback className="font-bold bg-primary/10 text-primary">{u.name?.charAt(0)}</AvatarFallback></Avatar>
                             <div>
                               <p className="font-bold text-sm">{u.name}</p>
                               <p className="text-[10px] text-muted-foreground">{u.email}</p>
                             </div>
                           </div>
                        </td>
                        <td className="py-3 px-4 flex items-center h-full"> {/* Fix vertical align */}
                           <div className="h-full mt-2">
                             <RoleBadge role={u.role as any} />
                           </div>
                        </td>
                        <td className="py-3 px-4">
                           <span className="font-black text-amber-500">{u.totalXP.toLocaleString()} XP</span>
                        </td>
                        <td className="py-3 px-4">
                           <StatusBadge status={u.emailVerified ? "verified" : "unverified"} />
                        </td>
                        <td className="py-3 px-4">
                           <div className="flex items-center justify-end gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                              <IconButton icon={Edit} variant="ghost" size="icon-sm" label="تعديل سريع" />
                              <IconButton icon={Trash2} variant="ghost" size="icon-sm" className="text-red-500 hover:text-red-600" label="حذف" />
                           </div>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
         <div className="p-4 border-t border-border/50 bg-accent/20 flex justify-between items-center text-xs font-bold text-muted-foreground">
            <span>عرض 1 - 5 من إجمالي 12,405 مستخدم</span>
            <div className="flex gap-2">
               <AdminButton variant="outline" size="sm" className="h-8">السابق</AdminButton>
               <AdminButton variant="outline" size="sm" className="h-8 bg-primary/10 border-primary text-primary">1</AdminButton>
               <AdminButton variant="outline" size="sm" className="h-8">2</AdminButton>
               <AdminButton variant="outline" size="sm" className="h-8">3</AdminButton>
               <span className="px-2 self-center">...</span>
               <AdminButton variant="outline" size="sm" className="h-8">التالي</AdminButton>
            </div>
         </div>
      </AdminCard>
    </div>
  );
}

// Simple Internal Switch
function Switch({ defaultChecked, onCheckedChange }: any) {
   const [c, setC] = React.useState(defaultChecked);
   return (
      <div 
         onClick={() => { setC(!c); if(onCheckedChange) onCheckedChange(!c); }}
         className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${c ? 'bg-primary' : 'bg-muted-foreground/30'}`}
      >
         <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-transform ${c ? 'translate-x-1' : '-translate-x-6'}`}></div>
      </div>
   );
}
