'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/card";
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Icons } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';

export default function TwoFactorSettings() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  const handleEnableTwoFactor = async () => {
    setIsEnabling(true);
    try {
      // In a real implementation, you would:
      // 1. Call an API to generate a 2FA secret
      // 2. Display a QR code for the user to scan
      // 3. Ask for verification code
      // 4. Enable 2FA after verification
      
      // For demo purposes, we'll simulate the process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock backup codes
      const codes = Array.from({ length: 10 }, () => 
        Math.random().toString(36).substring(2, 10).toUpperCase()
      );
      
      setBackupCodes(codes);
      setShowBackupCodes(true);
      toast.success('تم تفعيل المصادقة الثنائية');
    } catch (error) {
      toast.error('فشل في تفعيل المصادقة الثنائية');
    } finally {
      setIsEnabling(false);
    }
  };

  const handleDisableTwoFactor = async () => {
    try {
      // In a real implementation, you would call an API to disable 2FA
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setIsEnabled(false);
      setBackupCodes([]);
      setShowBackupCodes(false);
      toast.success('تم تعطيل المصادقة الثنائية');
    } catch (error) {
      toast.error('فشل في تعطيل المصادقة الثنائية');
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      toast.error('الرجاء إدخال رمز مكون من 6 أرقام');
      return;
    }
    
    try {
      // In a real implementation, you would verify the code with the API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setIsEnabled(true);
      setShowBackupCodes(false);
      setVerificationCode('');
      toast.success('تم التحقق بنجاح وتفعيل المصادقة الثنائية');
    } catch (error) {
      toast.error('رمز التحقق غير صحيح');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>المصادقة الثنائية</CardTitle>
        <CardDescription>
          أضف طبقة إضافية من الأمان إلى حسابك
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label>المصادقة الثنائية</Label>
            <p className="text-sm text-gray-500">
              {isEnabled 
                ? 'المصادقة الثنائية مفعلة' 
                : 'فعّل المصادقة الثنائية لزيادة أمان حسابك'}
            </p>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={(checked) => {
              if (checked) {
                handleEnableTwoFactor();
              } else {
                handleDisableTwoFactor();
              }
            }}
          />
        </div>

        {isEnabling && (
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center gap-2 mb-4">
              <Icons.spinner className="h-4 w-4 animate-spin" />
              <span>جارٍ تفعيل المصادقة الثنائية...</span>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="verification-code">أدخل رمز التحقق</Label>
                <Input
                  id="verification-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="123456"
                  className="mt-1"
                />
              </div>
              <Button onClick={handleVerifyCode} disabled={verificationCode.length !== 6}>
                التحقق وتفعيل
              </Button>
            </div>
          </div>
        )}

        {showBackupCodes && (
          <div className="p-4 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
            <h3 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
              رموز الاسترجاع
            </h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
              احفظ هذه الرموز في مكان آمن. يمكنك استخدام كل رمز مرة واحدة فقط في حالة عدم 
              توفر جهازك.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((code, index) => (
                <div 
                  key={index} 
                  className="font-mono text-sm p-2 bg-white dark:bg-gray-800 rounded border"
                >
                  {code}
                </div>
              ))}
            </div>
            <Button 
              variant="outline" 
              className="mt-4 w-full"
              onClick={() => {
                navigator.clipboard.writeText(backupCodes.join('\n'));
                toast.success('تم نسخ الرموز إلى الحافظة');
              }}
            >
              نسخ الرموز
            </Button>
          </div>
        )}

        {isEnabled && !isEnabling && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
              <h3 className="font-medium text-green-800 dark:text-green-200 mb-2">
                المصادقة الثنائية مفعلة
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                تمت إضافة طبقة أمان إضافية إلى حسابك. سيتم طلب رمز التحقق عند كل تسجيل دخول.
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDisableTwoFactor}>
                تعطيل المصادقة الثنائية
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  // In a real implementation, you would regenerate backup codes
                  const newCodes = Array.from({ length: 10 }, () => 
                    Math.random().toString(36).substring(2, 10).toUpperCase()
                  );
                  setBackupCodes(newCodes);
                  setShowBackupCodes(true);
                  toast.success('تم إنشاء رموز استرجاع جديدة');
                }}
              >
                إنشاء رموز استرجاع جديدة
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}