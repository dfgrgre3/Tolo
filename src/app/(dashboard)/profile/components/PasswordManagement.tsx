'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { Key, AlertTriangle, CheckCircle2, Eye, EyeOff, Shield, RefreshCw } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const getPasswordStrengthDisplay = (password: string) => ({
  score: password.length > 8 ? 100 : 0,
  label: password.length > 8 ? 'قوية' : 'ضعيفة',
  color: password.length > 8 ? 'bg-green-500' : 'bg-red-500',
  checks: {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password)
  }
});
import { logger } from '@/lib/logger';

interface PasswordManagementProps {
  userId: string;
}

export default function PasswordManagement({ userId }: PasswordManagementProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [isCheckingLeak, setIsCheckingLeak] = useState(false);
  const [isLeaked, setIsLeaked] = useState<boolean | null>(null);
  const [checkPassword, setCheckPassword] = useState('');

  const passwordStrength = getPasswordStrengthDisplay(newPassword);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('الرجاء ملء جميع الحقول');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('كلمة المرور الجديدة وتأكيدها غير متطابقين');
      return;
    }

    if (passwordStrength.score < 40) {
      toast.error('كلمة المرور ضعيفة جداً. الرجاء اختيار كلمة مرور أقوى');
      return;
    }

    try {
      setIsChanging(true);
      // Token is in httpOnly cookie - no need to send Authorization header
      
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (response.ok) {
        toast.success('تم تغيير كلمة المرور بنجاح');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const error = await response.json();
        toast.error(error.error || 'فشل في تغيير كلمة المرور');
      }
    } catch (error) {
      logger.error('Error changing password:', error);
      toast.error('حدث خطأ أثناء تغيير كلمة المرور');
    } finally {
      setIsChanging(false);
    }
  };

  const handleCheckLeakedPassword = async () => {
    if (!checkPassword) {
      toast.error('الرجاء إدخال كلمة المرور للتحقق');
      return;
    }

    try {
      setIsCheckingLeak(true);
      
      // Use Have I Been Pwned API (k-anonymity)
      const passwordHash = await sha256(checkPassword);
      const hashPrefix = passwordHash.substring(0, 5);
      const hashSuffix = passwordHash.substring(5);

      const response = await fetch(`https://api.pwnedpasswords.com/range/${hashPrefix}`);
      const data = await response.text();
      
      const hashes = data.split('\n');
      const found = hashes.some(line => {
        const [hash, count] = line.split(':');
        return hash.toLowerCase() === hashSuffix.toLowerCase();
      });

      setIsLeaked(found);
      
      if (found) {
        toast.error('⚠️ تم العثور على كلمة المرور في قاعدة البيانات المسربة. يرجى استخدام كلمة مرور أخرى.');
      } else {
        toast.success('✓ كلمة المرور آمنة ولم يتم العثور عليها في قواعد البيانات المسربة');
      }
    } catch (error) {
      logger.error('Error checking leaked password:', error);
      toast.error('حدث خطأ أثناء التحقق من كلمة المرور');
    } finally {
      setIsCheckingLeak(false);
    }
  };

  const sha256 = async (message: string): Promise<string> => {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const getPasswordSuggestions = () => {
    const suggestions: string[] = [];
    
    if (newPassword.length < 8) {
      suggestions.push('استخدم على الأقل 8 أحرف');
    }
    if (!passwordStrength.checks.hasUpper) {
      suggestions.push('أضف حرف كبير واحد على الأقل');
    }
    if (!passwordStrength.checks.hasLower) {
      suggestions.push('أضف حرف صغير واحد على الأقل');
    }
    if (!passwordStrength.checks.hasNumber) {
      suggestions.push('أضف رقم واحد على الأقل');
    }
    if (!passwordStrength.checks.hasSpecial) {
      suggestions.push('أضف رمز خاص (!@#$%^&*)');
    }
    if (newPassword.length < 12) {
      suggestions.push('استخدم 12 حرف أو أكثر للأمان الأفضل');
    }

    return suggestions;
  };

  return (
    <div className="space-y-6">
      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            تغيير كلمة المرور
          </CardTitle>
          <CardDescription>
            قم بتغيير كلمة المرور بانتظام للحفاظ على أمان حسابك
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">كلمة المرور الحالية</Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الحالية"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">كلمة المرور الجديدة</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الجديدة"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Password Strength Indicator */}
          {newPassword && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>قوة كلمة المرور</Label>
                <Badge className={passwordStrength.color}>
                  {passwordStrength.label}
                </Badge>
              </div>
              <Progress value={passwordStrength.score} className="h-2" />
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className={`flex items-center gap-2 ${passwordStrength.checks.minLength ? 'text-green-600' : 'text-gray-400'}`}>
                  {passwordStrength.checks.minLength ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  <span>8 أحرف على الأقل</span>
                </div>
                <div className={`flex items-center gap-2 ${passwordStrength.checks.hasUpper ? 'text-green-600' : 'text-gray-400'}`}>
                  {passwordStrength.checks.hasUpper ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  <span>حرف كبير</span>
                </div>
                <div className={`flex items-center gap-2 ${passwordStrength.checks.hasLower ? 'text-green-600' : 'text-gray-400'}`}>
                  {passwordStrength.checks.hasLower ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  <span>حرف صغير</span>
                </div>
                <div className={`flex items-center gap-2 ${passwordStrength.checks.hasNumber ? 'text-green-600' : 'text-gray-400'}`}>
                  {passwordStrength.checks.hasNumber ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  <span>رقم</span>
                </div>
                <div className={`flex items-center gap-2 ${passwordStrength.checks.hasSpecial ? 'text-green-600' : 'text-gray-400'}`}>
                  {passwordStrength.checks.hasSpecial ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  <span>رمز خاص</span>
                </div>
              </div>

              {getPasswordSuggestions().length > 0 && (
                <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200">
                  <h4 className="font-medium text-sm mb-2">اقتراحات لتحسين كلمة المرور:</h4>
                  <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                    {getPasswordSuggestions().map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="confirm-password">تأكيد كلمة المرور الجديدة</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="أعد إدخال كلمة المرور الجديدة"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-sm text-red-600">كلمة المرور غير متطابقة</p>
            )}
          </div>

          <Button
            onClick={handleChangePassword}
            disabled={isChanging || passwordStrength.score < 40 || newPassword !== confirmPassword}
            className="w-full"
          >
            {isChanging ? (
              <>
                <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                جاري التغيير...
              </>
            ) : (
              <>
                <Key className="h-4 w-4 ml-2" />
                تغيير كلمة المرور
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Check Leaked Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            التحقق من كلمة المرور المسربة
          </CardTitle>
          <CardDescription>
            تحقق مما إذا كانت كلمة المرور الخاصة بك قد تم تسريبها في قاعدة بيانات مسربة
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-900/20">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">كيف يعمل التحقق:</p>
                <p>نستخدم خدمة Have I Been Pwned للتحقق من كلمة المرور. يتم إرسال فقط جزء من رمز التجزئة (hash) الخاص بكلمة المرور، ولا يتم إرسال كلمة المرور نفسها. هذا يضمن خصوصيتك وأمانك.</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="check-password">أدخل كلمة المرور للتحقق</Label>
            <Input
              id="check-password"
              type="password"
              value={checkPassword}
              onChange={(e) => setCheckPassword(e.target.value)}
              placeholder="أدخل كلمة المرور للتحقق من تسريبها"
            />
          </div>

          {isLeaked !== null && (
            <div className={`p-4 rounded-lg border ${
              isLeaked 
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200' 
                : 'bg-green-50 dark:bg-green-900/20 border-green-200'
            }`}>
              <div className="flex items-start gap-3">
                {isLeaked ? (
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                )}
                <div className={`text-sm ${
                  isLeaked 
                    ? 'text-red-800 dark:text-red-200' 
                    : 'text-green-800 dark:text-green-200'
                }`}>
                  <p className="font-medium mb-1">
                    {isLeaked ? '⚠️ كلمة المرور مسربة' : '✓ كلمة المرور آمنة'}
                  </p>
                  <p>
                    {isLeaked 
                      ? 'تم العثور على كلمة المرور هذه في قاعدة بيانات مسربة. يرجى استخدام كلمة مرور أخرى فوراً.' 
                      : 'لم يتم العثور على كلمة المرور في قواعد البيانات المسربة المعروفة.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={handleCheckLeakedPassword}
            disabled={isCheckingLeak || !checkPassword}
            className="w-full"
            variant="outline"
          >
            {isCheckingLeak ? (
              <>
                <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                جاري التحقق...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 ml-2" />
                التحقق من كلمة المرور
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

