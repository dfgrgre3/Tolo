'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SecurityLogs from './SecurityLogs';
import AdvancedProtection from './AdvancedProtection';
import PasswordManagement from './PasswordManagement';
import { Shield, Key, AlertTriangle, Globe } from "lucide-react";

interface SecurityTabProps {
  userId: string | null;
}

export default function SecurityTab({ userId }: SecurityTabProps) {
  if (!userId) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">يجب تسجيل الدخول لعرض إعدادات الأمان</p>
      </div>);

  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          الأمان والخصوصية
        </h2>
        <p className="text-muted-foreground mt-1">
          إدارة إعدادات الأمان والمصادقة لحسابك
        </p>
      </div>

      <Tabs defaultValue="sessions" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            السجلات
          </TabsTrigger>
          <TabsTrigger value="protection" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            الحماية المتقدمة
          </TabsTrigger>
          <TabsTrigger value="password" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            كلمة المرور
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-6 mt-6">
          <SecurityLogs userId={userId} />
        </TabsContent>

        <TabsContent value="protection" className="space-y-6 mt-6">
          <AdvancedProtection userId={userId} />
        </TabsContent>

        <TabsContent value="password" className="space-y-6 mt-6">
          <PasswordManagement _userId={userId} />
        </TabsContent>
      </Tabs>
    </div>);

}