"use client";

import type { UserDetails } from "./types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Shield,
  User as UserIcon,
  Mail,
  Hash,
  Phone,
  School,
  Save
} from "lucide-react";

export function SettingsTab({
  user,
  editedUser,
  setEditedUser,
  handleUpdate,
  setIsEditing
}: {
  user: UserDetails;
  editedUser: Partial<UserDetails>;
  setEditedUser: (u: Partial<UserDetails>) => void;
  handleUpdate: () => Promise<void>;
  setIsEditing: (e: boolean) => void;
}) {
  return (
    <Card className="border-none shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          إعدادات الحساب والصلاحيات
        </CardTitle>
        <CardDescription>تعديل الدور والصلاحيات الأساسية للمستخدم</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-bold">دور المستخدم</label>
            <Select value={editedUser.role || user.role} onValueChange={(val) => setEditedUser({ ...editedUser, role: val })}>
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STUDENT">طالب</SelectItem>
                <SelectItem value="TEACHER">معلم</SelectItem>
                <SelectItem value="ADMIN">مدير</SelectItem>
                <SelectItem value="MODERATOR">مشرف</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">تغيير الدور سيؤثر على الصلاحيات التي يمتلكها المستخدم في المنصة.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold">المرحلة الدراسية</label>
            <Select value={editedUser.gradeLevel || ""} onValueChange={(val) => setEditedUser({ ...editedUser, gradeLevel: val })}>
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue placeholder="اختر المرحلة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="أولى إعدادي">أولى إعدادي</SelectItem>
                <SelectItem value="ثانية إعدادي">ثانية إعدادي</SelectItem>
                <SelectItem value="ثالثة إعدادي">ثالثة إعدادي</SelectItem>
                <SelectItem value="أولى ثانوي">أولى ثانوي</SelectItem>
                <SelectItem value="ثانية ثانوي">ثانية ثانوي</SelectItem>
                <SelectItem value="ثالثة ثانوي">ثالثة ثانوي</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        <div className="space-y-6">
          <h4 className="font-bold text-sm">بيانات الملف الشخصي</h4>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">الاسم الكامل</label>
              <div className="relative">
                <UserIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  className="w-full h-11 pr-10 rounded-xl border bg-muted/50 px-4 text-sm focus:ring-2 ring-primary/20 outline-none transition-all"
                  value={editedUser.name || ""}
                  onChange={(e) => setEditedUser({ ...editedUser, name: e.target.value })}
                  placeholder="الاسم الكامل" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  className="w-full h-11 pr-10 rounded-xl border bg-muted/50 px-4 text-sm focus:ring-2 ring-primary/20 outline-none transition-all"
                  value={editedUser.email || ""}
                  onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })}
                  placeholder="البريد الإلكتروني" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">اسم المستخدم</label>
              <div className="relative">
                <Hash className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  className="w-full h-11 pr-10 rounded-xl border bg-muted/50 px-4 text-sm focus:ring-2 ring-primary/20 outline-none transition-all"
                  value={editedUser.username || ""}
                  onChange={(e) => setEditedUser({ ...editedUser, username: e.target.value })}
                  placeholder="اسم المستخدم" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">رقم الهاتف</label>
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  className="w-full h-11 pr-10 rounded-xl border bg-muted/50 px-4 text-sm focus:ring-2 ring-primary/20 outline-none transition-all"
                  value={editedUser.phone || ""}
                  onChange={(e) => setEditedUser({ ...editedUser, phone: e.target.value })}
                  placeholder="رقم الهاتف" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">المدرسة</label>
              <div className="relative">
                <School className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  className="w-full h-11 pr-10 rounded-xl border bg-muted/50 px-4 text-sm focus:ring-2 ring-primary/20 outline-none transition-all"
                  value={editedUser.school || ""}
                  onChange={(e) => setEditedUser({ ...editedUser, school: e.target.value })}
                  placeholder="اسم المدرسة" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">نوع التعليم</label>
              <Select value={editedUser.educationType || ""} onValueChange={(val) => setEditedUser({ ...editedUser, educationType: val })}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="اختر النوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="عام">عام</SelectItem>
                  <SelectItem value="أزهري">أزهري</SelectItem>
                  <SelectItem value="دولي">دولي</SelectItem>
                  <SelectItem value="IG">IG</SelectItem>
                  <SelectItem value="American">American</SelectItem>
                  <SelectItem value="أخرى">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">نبذة تعريفية (Bio)</label>
              <textarea
                className="w-full h-24 rounded-xl border bg-muted/50 p-4 text-sm focus:ring-2 ring-primary/20 outline-none transition-all resize-none"
                value={editedUser.bio || ""}
                onChange={(e) => setEditedUser({ ...editedUser, bio: e.target.value })}
                placeholder="اكتب نبذة عن المستخدم..." />
            </div>
          </div>

          <div className="flex justify-start gap-3 pt-4">
            <Button
              className="rounded-xl px-8 shadow-lg shadow-primary/20"
              onClick={handleUpdate}>
              <Save className="ml-2 h-4 w-4" />
              حفظ التغييرات
            </Button>
            <Button
              variant="ghost"
              className="rounded-xl"
              onClick={() => {
                setIsEditing(false);
                setEditedUser(user);
              }}>
              إلغاء
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
