'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { SettingsCard } from './components';
import { ActiveSessions } from '@/components/auth/ActiveSessions';

import type { ProfileData } from './_components/profile-data';
import { initialProfile, syncProfileWithUser } from './_components/profile-data';
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
  const [profile, setProfile] = useState<ProfileData>(initialProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setProfile(syncProfileWithUser(user));
    }
  }, [user]);

  const handleInputChange = <K extends keyof ProfileData,>(field: K, value: ProfileData[K]) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleAvatarClick = () => {
    if (isEditing) fileInputRef.current?.click();
  };

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

  const handleSave = async () => {
    if (!hasChanges) return;
    setIsSaving(true);

    try {
      const response = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: `${profile.firstName} ${profile.lastName}`.trim(),
          username: profile.username,
          phone: profile.phone,
          alternativePhone: profile.alternativePhone,
          birthDate: profile.birthDate,
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
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'حدث خطأ أثناء الحفظ');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setProfile(syncProfileWithUser(user));
    }
    setIsEditing(false);
    setHasChanges(false);
  };

  if (isLoading) return <LoadingState />;
  if (!user) return null;

  const isTeacher = user.role === 'TEACHER';

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <ProfileHeader isEditing={isEditing} isSaving={isSaving} hasChanges={hasChanges} onEdit={() => setIsEditing(true)} onCancel={handleCancel} onSave={handleSave} />

      <VerificationWarning verified={user.emailVerified ?? false} />

      <ProfileHero profile={profile} user={user} isEditing={isEditing} isUploadingAvatar={isUploadingAvatar} onAvatarClick={handleAvatarClick} fileInputRef={fileInputRef} onAvatarChange={handleAvatarChange} />

      <PersonalInfoForm profile={profile} isEditing={isEditing} hasChanges={hasChanges} onInputChange={handleInputChange} />

      <AcademicInfoForm profile={profile} isEditing={isEditing} isTeacher={isTeacher} onInputChange={handleInputChange} />

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
          <ActiveSessions />
        </div>
      </SettingsCard>

      <PrivacyInfoPanel />
    </div>
  );
}
