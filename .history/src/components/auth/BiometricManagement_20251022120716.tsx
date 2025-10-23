'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/shared/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, AlertCircle, Fingerprint, Smartphone, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useEnhancedAuth } from '@/lib/auth-hook-enhanced';

interface BiometricCredential {
  id: string;
  credentialId: string;
  deviceName: string;
  createdAt: string;
}

export default function BiometricManagement() {
  const { user, setupTwoFactor, verifyTwoFactorSetup, disableTwoFactor, setupBiometricAuth, disableBiometricAuth } = useEnhancedAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [credentials, setCredentials] = useState<BiometricCredential[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [setupInProgress, setSetupInProgress] = useState(false);

  // Fetch biometric credentials
  const fetchCredentials = async () => {
    try {
      const response = await fetch('/api/auth/biometric/credentials', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCredentials(data.credentials || []);
      }
    } catch (error) {
      console.error('Error fetching biometric credentials:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCredentials();
    }
  }, [user]);

  const handleSetupBiometric = async () => {
    if (!deviceName.trim()) {
      toast.error('يرجى إدخال اسم الجهاز');
      return;
    }

    setIsLoading(true);
    try {
      // In a real implementation, this would use WebAuthn API
      // For now, we'll simulate it
      const response = await fetch('/api/auth/biometric/setup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to setup biometric authentication');
      }

      const data = await response.json();

      // In a real implementation, we would use the challenge to create a credential
      // For now, we'll just simulate it
      setSetupInProgress(true);
      toast.success('تم إعداد المصادقة البيومترية بنجاح');

      // Refresh credentials list
      fetchCredentials();
      setIsDialogOpen(false);
      setDeviceName('');
    } catch (error: any) {
      toast.error(error.message || 'فشل إعداد المصادقة البيومترية');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveCredential = async (credentialId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/biometric/credentials', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ credentialId })
      });

      if (!response.ok) {
        throw new Error('Failed to remove biometric credential');
      }

      toast.success('تم إزالة جهاز المصادقة البيومترية بنجاح');

      // Refresh credentials list
      fetchCredentials();
    } catch (error: any) {
      toast.error(error.message || 'فشل إزالة جهاز المصادقة البيومترية');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableBiometric = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/biometric/setup', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to disable biometric authentication');
      }

      toast.success('تم تعطيل المصادقة البيومترية بنجاح');

      // Refresh credentials list
      setCredentials([]);
    } catch (error: any) {
      toast.error(error.message || 'فشل تعطيل المصادقة البيومترية');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            المصادقة البيومترية
          </CardTitle>
          <CardDescription>
            إدارة أجهزة المصادقة البيومترية الخاصة بك
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {credentials.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                لم تقم بإعداد أي أجهزة مصادقة بيومترية بعد. أضف جهازًا للتمكن من استخدام المصادقة البيومترية.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {credentials.map((credential) => (
                <div key={credential.id} className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{credential.deviceName}</p>
                      <p className="text-sm text-muted-foreground">
                        تمت الإضافة: {new Date(credential.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveCredential(credential.credentialId)}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  إضافة جهاز مصادقة بيومترية
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>إضافة جهاز مصادقة بيومترية</DialogTitle>
                  <DialogDescription>
                    قم بإدخال اسم للجهاز الذي تريد إضافته للمصادقة البيومترية
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="deviceName">اسم الجهاز</Label>
                    <Input
                      id="deviceName"
                      value={deviceName}
                      onChange={(e) => setDeviceName(e.target.value)}
                      placeholder="مثال: هاتفي الشخصي"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    إلغاء
                  </Button>
                  <Button onClick={handleSetupBiometric} disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    إضافة
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {credentials.length > 0 && (
              <Button
                variant="outline"
                onClick={handleDisableBiometric}
                disabled={isLoading}
              >
                تعطيل المصادقة البيومترية
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
