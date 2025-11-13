'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/card";
import { Button } from "@/shared/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/shared/badge";
import { toast } from 'sonner';
import { Mail, Link as LinkIcon, Unlink, CheckCircle2, Globe, Smartphone, Building2, Code } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { logger } from '@/lib/logger';

interface LoginMethodsProps {
  userId: string;
}

interface ConnectedAccount {
  provider: string;
  email?: string;
  connectedAt: string;
  isPrimary: boolean;
}

interface MagicLinkSettings {
  enabled: boolean;
  expiresInMinutes: number;
}

export default function LoginMethods({ userId }: LoginMethodsProps) {
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [magicLinkEnabled, setMagicLinkEnabled] = useState(false);
  const [magicLinkEmail, setMagicLinkEmail] = useState('');
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false);

  useEffect(() => {
    loadConnectedAccounts();
    loadMagicLinkSettings();
  }, [userId]);

  const loadConnectedAccounts = async () => {
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const response = await fetch('/api/auth/oauth/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setConnectedAccounts(data.accounts || []);
      }
    } catch (error) {
      logger.error('Error loading connected accounts:', error);
    }
  };

  const loadMagicLinkSettings = async () => {
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const response = await fetch('/api/auth/magic-link/settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMagicLinkEnabled(data.enabled || false);
      }
    } catch (error) {
      // Endpoint might not exist yet, that's okay
      logger.info('Magic link settings endpoint not available');
    }
  };

  const handleConnectProvider = async (provider: string) => {
    try {
      // Redirect to OAuth provider
      const redirectUrl = `${window.location.origin}/api/auth/${provider}`;
      window.location.href = redirectUrl;
    } catch (error) {
      logger.error('Error connecting provider:', error);
      toast.error('فشل في الاتصال بالمزود');
    }
  };

  const handleDisconnectProvider = async (provider: string) => {
    if (!confirm(`هل أنت متأكد من فك ربط حساب ${provider}؟`)) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const response = await fetch(`/api/auth/oauth/disconnect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider }),
      });

      if (response.ok) {
        setConnectedAccounts(connectedAccounts.filter(acc => acc.provider !== provider));
        toast.success(`تم فك ربط حساب ${provider}`);
      } else {
        toast.error('فشل في فك الربط');
      }
    } catch (error) {
      logger.error('Error disconnecting provider:', error);
      toast.error('حدث خطأ أثناء فك الربط');
    }
  };

  const handleSendMagicLink = async () => {
    if (!magicLinkEmail) {
      toast.error('الرجاء إدخال البريد الإلكتروني');
      return;
    }

    try {
      setIsSendingMagicLink(true);
      const response = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: magicLinkEmail }),
      });

      if (response.ok) {
        toast.success('تم إرسال رابط تسجيل الدخول إلى بريدك الإلكتروني');
        setMagicLinkEmail('');
      } else {
        const error = await response.json();
        toast.error(error.error || 'فشل في إرسال رابط تسجيل الدخول');
      }
    } catch (error) {
      logger.error('Error sending magic link:', error);
      toast.error('حدث خطأ أثناء إرسال رابط تسجيل الدخول');
    } finally {
      setIsSendingMagicLink(false);
    }
  };

  // Provider icons component
  const ProviderIcon = ({ providerId, color }: { providerId: string; color: string }) => {
    const iconClass = `w-5 h-5`;
    
    switch (providerId) {
      case 'google':
        return (
          <svg className={iconClass} style={{ color }} viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
        );
      case 'facebook':
        return (
          <svg className={iconClass} style={{ color }} viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        );
      case 'apple':
        return (
          <svg className={iconClass} style={{ color }} viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
        );
      case 'microsoft':
        return (
          <svg className={iconClass} style={{ color }} viewBox="0 0 24 24" fill="currentColor">
            <path fill="#F25022" d="M1 1h10v10H1z"/>
            <path fill="#7FBA00" d="M13 1h10v10H13z"/>
            <path fill="#00A4EF" d="M1 13h10v10H1z"/>
            <path fill="#FFB900" d="M13 13h10v10H13z"/>
          </svg>
        );
      case 'github':
        return (
          <Code className={iconClass} style={{ color }} />
        );
      default:
        return <Globe className={iconClass} style={{ color }} />;
    }
  };

  const providers = [
    { id: 'google', name: 'Google', color: '#4285F4' },
    { id: 'facebook', name: 'Facebook', color: '#1877F2' },
    { id: 'apple', name: 'Apple', color: '#000000' },
    { id: 'microsoft', name: 'Microsoft', color: '#0078D4' },
    { id: 'github', name: 'GitHub', color: '#24292E' },
  ];

  const isConnected = (providerId: string) => {
    return connectedAccounts.some(acc => acc.provider === providerId);
  };

  return (
    <div className="space-y-6">
      {/* Magic Link Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            تسجيل الدخول بدون كلمة مرور (Magic Link)
          </CardTitle>
          <CardDescription>
            تسجيل الدخول عبر رابط يرسل إلى بريدك الإلكتروني بدون الحاجة إلى كلمة مرور
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="text-base">Magic Link Authentication</Label>
                <p className="text-sm text-muted-foreground">
                  تمكين تسجيل الدخول عبر رابط بريدي
                </p>
              </div>
            </div>
            <Switch
              checked={magicLinkEnabled}
              onCheckedChange={setMagicLinkEnabled}
            />
          </div>

          {magicLinkEnabled && (
            <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-900/20">
              <h3 className="font-medium mb-4">إرسال رابط تسجيل الدخول</h3>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="البريد الإلكتروني"
                  value={magicLinkEmail}
                  onChange={(e) => setMagicLinkEmail(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMagicLink}
                  disabled={isSendingMagicLink || !magicLinkEmail}
                >
                  {isSendingMagicLink ? (
                    <>جاري الإرسال...</>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 ml-2" />
                      إرسال الرابط
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                سيتم إرسال رابط تسجيل الدخول إلى البريد الإلكتروني المدخل. الرابط صالح لمدة 15 دقيقة.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Social Login Providers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            تسجيل الدخول عبر الحسابات الاجتماعية
          </CardTitle>
          <CardDescription>
            ربط حسابك بحسابات التواصل الاجتماعي لتسجيل الدخول بسهولة
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {providers.map((provider) => {
            const connected = isConnected(provider.id);
            const account = connectedAccounts.find(acc => acc.provider === provider.id);

            return (
              <div
                key={provider.id}
                className="flex items-center justify-between p-4 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${provider.color}20` }}
                  >
                    <ProviderIcon providerId={provider.id} color={provider.color} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Label className="text-base">{provider.name}</Label>
                      {connected && (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle2 className="h-3 w-3 ml-1" />
                          متصل
                        </Badge>
                      )}
                    </div>
                    {account && (
                      <p className="text-sm text-muted-foreground">
                        {account.email && `متصل بـ: ${account.email}`}
                        {account.connectedAt && ` • منذ ${new Date(account.connectedAt).toLocaleDateString('ar-EG')}`}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  {connected ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDisconnectProvider(provider.id)}
                    >
                      <Unlink className="h-4 w-4 ml-2" />
                      فك الربط
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleConnectProvider(provider.id)}
                      className="text-white"
                      style={{ backgroundColor: provider.color }}
                    >
                      <span className="ml-2">ربط الحساب</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          {connectedAccounts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>لا توجد حسابات مرتبطة</p>
              <p className="text-sm mt-2">اربط حساباتك الاجتماعية لتسجيل الدخول بسهولة</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

