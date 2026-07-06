'use client';

import { useAuth } from "@/hooks/use-auth";
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useGamification } from '@/hooks/use-gamification';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { SettingsCard } from './components';

import type { ProfileData } from './_components/profile-data';
import { initialProfile, syncProfileWithUser, calculateProfileCompletion, getFullName } from './_components/profile-data';
import { LoadingState } from './_components/loading-state';
import { ProfileHeader } from './_components/profile-header';
import { VerificationWarning } from './_components/verification-warning';
import { ProfileHero } from './_components/profile-hero';
import { PersonalInfoForm } from './_components/personal-info-form';
import { AcademicInfoForm } from './_components/academic-info-form';
import { BioSection } from './_components/bio-section';
import { SecurityLinks } from './_components/security-links';
import { PrivacyInfoPanel } from './_components/privacy-info-panel';

export default function ProfileSettingsPage() {
  const { user, isLoading, refreshUser } = useAuth();
  const { userProgress } = useGamification({ userId: user?.id || "" });
  
  const [profile, setProfile] = useState<ProfileData>(initialProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof ProfileData, string>>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setProfile(syncProfileWithUser(user as any));
    }
  }, [user]);

  const profileCompletion = useMemo(() => calculateProfileCompletion(profile), [profile]);
  
  const fullName = useMemo(() => getFullName(profile), [profile]);

  const validateProfile = useCallback((profile: ProfileData): boolean => {
    const errors: Partial<Record<keyof ProfileData, string>> = {};

    if (profile.username && profile.username.length < 3) {
      errors.username = 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل';
    }

    if (profile.phone && !/^01[0-2,5]{1}[0-9]{8}$/.test(profile.phone.replace(/\s/g, ''))) {
      errors.phone = 'رقم الهاتف غير صحيح';
    }

    if (profile.alternativePhone && !/^01[0-2,5]{1}[0-9]{8}$/.test(profile.alternativePhone.replace(/\s/g, ''))) {
      errors.alternativePhone = 'رقم الهاتف غير صحيح';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, []);

  const handleInputChange = useCallback(<K extends keyof ProfileData>(field: K, value: ProfileData[K]) => {
    setProfile((prev) => {
      const updated = { ...prev, [field]: value };
      
      if (validationErrors[field]) {
        setValidationErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
      
      return updated;
    });
    setHasChanges(true);
  }, [validationErrors]);

  const handleAvatarClick = useCallback(() => {
    if (isEditing) fileInputRef.current?.click();
  }, [isEditing]);

  const handleAvatarChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة صحيح');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
      return;
    }

    setIsUploadingAvatar(true);

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfile((prev) => ({ ...prev, avatar: event.target?.result as string }));
        setHasChanges(true);
        setIsUploadingAvatar(false);
        toast.success('تمت معاينة الصورة (احفظ التغييرات لاعتمادها)');
      };
      reader.readAsDataURL(file);
    } catch {
      setIsUploadingAvatar(false);
      toast.error('فشل تحميل الصورة');
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!hasChanges || !validateProfile(profile)) {
      toast.error('يرجى التحقق من صحة البيانات المدخلة');
      return;
    }
    
    setIsSaving(true);

    try {
      const response = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: fullName,
          username: profile.username,
          phone: profile.phone,
          alternativePhone: profile.alternativePhone,
          birthDate: profile.birthDate || undefined,
          gender: profile.gender,
          country: profile.country,
          city: profile.city,
          school: profile.school,
          gradeLevel: profile.gradeLevel,
          educationType: profile.educationType,
          section: profile.section,
          studyGoal: profile.studyGoal,
          bio: profile.bio,
          avatar: profile.avatar
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'فشل حفظ التغييرات');
      }

      await refreshUser();
      toast.success('تم حفظ التغييرات بنجاح ✓');
      setIsEditing(false);
      setHasChanges(false);
      setValidationErrors({});
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'حدث خطأ أثناء الحفظ');
    } finally {
      setIsSaving(false);
    }
  }, [hasChanges, profile, validateProfile, fullName, refreshUser]);

  const handleCancel = useCallback(() => {
    if (user) {
      setProfile(syncProfileWithUser(user));
    }
    setIsEditing(false);
    setHasChanges(false);
    setValidationErrors({});
  }, [user]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
    setValidationErrors({});
  }, []);

  if (isLoading) return <LoadingState />;
  if (!user) return null;

  const isTeacher = user.role === 'TEACHER';

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <ProfileHeader 
        isEditing={isEditing} 
        isSaving={isSaving} 
        hasChanges={hasChanges} 
        onEdit={handleEdit} 
        onCancel={handleCancel} 
        onSave={handleSave} 
      />

      <VerificationWarning verified={user.emailVerified ?? false} />

      <ProfileHero 
        profile={profile} 
        user={{
          ...user,
          totalXP: userProgress?.totalXP || 0,
          level: userProgress?.level || 1,
          currentStreak: userProgress?.currentStreak || 0,
        }} 
        isEditing={isEditing} 
        isUploadingAvatar={isUploadingAvatar} 
        onAvatarClick={handleAvatarClick} 
        fileInputRef={fileInputRef} 
        onAvatarChange={handleAvatarChange} 
        profileCompletion={profileCompletion}
      />

      <PersonalInfoForm 
        profile={profile} 
        isEditing={isEditing} 
        hasChanges={hasChanges} 
        validationErrors={validationErrors}
        onInputChange={handleInputChange} 
      />

      <AcademicInfoForm 
        profile={profile} 
        isEditing={isEditing} 
        isTeacher={isTeacher} 
        onInputChange={handleInputChange} 
      />

      <BioSection profile={profile} isEditing={isEditing} onInputChange={handleInputChange} />

      <SecurityLinks />

      <SettingsCard delay={0.3}>
        <div className="p-5 border-b border-white/10">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-400" />
            الأمان والأجهزة النشطة
          </h3>
        </div>
        <div className="p-6">
          <div className="text-sm text-muted-foreground py-4 text-center">إدارة الجلسات غير متوفرة حالياً</div>
        </div>
      </SettingsCard>

      <PrivacyInfoPanel />
    </div>
  );
}


