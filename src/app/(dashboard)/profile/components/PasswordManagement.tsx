'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock, Loader2 } from "lucide-react";

interface PasswordManagementProps {
  _userId: string;
}

export default function PasswordManagement({ _userId }: PasswordManagementProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('كلمات المرور الجديدة غير متطابقة');
      return;
    }

    setLoading(true);
    try {
      // Logic for changing password
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success('تم تغيير كلمة المرور بنجاح');
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (_error) {
      toast.error('فشل تغيير كلمة المرور');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          كلمة المرور
        </CardTitle>
        <CardDescription>
          تغيير كلمة مرور حسابك بانتظام يساعد في الحفاظ على أمان حسابك
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current">كلمة المرور الحالية</Label>
            <Input
              id="current"
              type="password"
              value={formData.currentPassword}
              onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
              required />
            
          </div>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="new">كلمة المرور الجديدة</Label>
              <Input
                id="new"
                type="password"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                required
                minLength={8} />
              
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">تأكيد كلمة المرور الجديدة</Label>
              <Input
                id="confirm"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required />
              
            </div>
          </div>
          <Button type="submit" className="w-full md:w-auto" disabled={loading}>
            {loading ?
            <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                جاري التحديث...
              </> :
            'تغيير كلمة المرور'}
          </Button>
        </form>
      </CardContent>
    </Card>);

}
