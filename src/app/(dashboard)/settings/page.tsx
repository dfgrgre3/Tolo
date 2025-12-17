'use client';

/**
 * 👤 صفحة الملف الشخصي - Profile Settings
 * 
 * الصفحة الرئيسية للإعدادات مع:
 * - معلومات الملف الشخصي
 * - تحميل الصورة
 * - البيانات الشخصية
 */

import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Camera,
  Loader2,
  Check,
  Edit3,
  Save,
  X,
  GraduationCap,
  Building2,
  Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useUnifiedAuth } from '@/contexts/auth-context';
import { AuthGuard } from '@/app/(auth)/components/AuthGuard';
import { SettingsHeader, SettingsInput, SettingsCard } from './components';

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;
  gender: 'male' | 'female';
  city: string;
  school: string;
  grade: string;
  bio: string;
  avatar: string;
}

const initialProfile: ProfileData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  birthDate: '',
  gender: 'male',
  city: '',
  school: '',
  grade: '3th',
  bio: '',
  avatar: '',
};

export default function ProfileSettingsPage() {
  const { user } = useUnifiedAuth();
  const [profile, setProfile] = useState<ProfileData>({
    ...initialProfile,
    firstName: user?.name?.split(' ')[0] || '',
    lastName: user?.name?.split(' ').slice(1).join(' ') || '',
    email: user?.email || '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
      return;
    }

    setIsUploadingAvatar(true);
    
    // Simulate upload
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setProfile(prev => ({ ...prev, avatar: event.target?.result as string }));
      setIsUploadingAvatar(false);
      toast.success('تم تحديث الصورة بنجاح');
    };
    reader.readAsDataURL(file);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('تم حفظ التغييرات بنجاح');
      setIsEditing(false);
    } catch {
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setIsSaving(false);
    }
  };

  const grades = [
    { value: '1th', label: 'الصف الأول الثانوي' },
    { value: '2th', label: 'الصف الثاني الثانوي' },
    { value: '3th', label: 'الصف الثالث الثانوي' },
  ];

  return (
    <AuthGuard>
      <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <SettingsHeader
        icon={User}
        title="الملف الشخصي"
        description="إدارة معلوماتك الشخصية وتحديث بياناتك"
        actionButton={
          !isEditing
            ? {
                label: 'تعديل',
                onClick: () => setIsEditing(true),
                variant: 'primary',
                icon: Edit3,
              }
            : {
                label: 'حفظ',
                onClick: handleSave,
                loading: isSaving,
                variant: 'primary',
                icon: Save,
              }
        }
      />
      
      {isEditing && (
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsEditing(false)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
        >
          <X className="h-4 w-4" />
          إلغاء
        </motion.button>
      )}

      {/* Avatar Section */}
      <SettingsCard gradient delay={0}>
        <div className="p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Avatar */}
          <div className="relative group">
            <div className="h-32 w-32 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-1">
              <div className="h-full w-full rounded-full bg-slate-800 flex items-center justify-center overflow-hidden">
                {profile.avatar ? (
                  <img src={profile.avatar} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-16 w-16 text-slate-400" />
                )}
              </div>
            </div>
            
            {isEditing && (
              <button
                onClick={handleAvatarClick}
                disabled={isUploadingAvatar}
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {isUploadingAvatar ? (
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                ) : (
                  <Camera className="h-8 w-8 text-white" />
                )}
              </button>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          {/* User Info Summary */}
          <div className="text-center sm:text-right flex-1">
            <h2 className="text-2xl font-bold text-white">
              {profile.firstName} {profile.lastName}
            </h2>
            <p className="text-slate-400 mt-1">{profile.email}</p>
            <div className="flex items-center justify-center sm:justify-start gap-4 mt-3">
              <div className="flex items-center gap-1 text-sm text-slate-400">
                <GraduationCap className="h-4 w-4" />
                <span>{grades.find(g => g.value === profile.grade)?.label}</span>
              </div>
              {profile.city && (
                <div className="flex items-center gap-1 text-sm text-slate-400">
                  <MapPin className="h-4 w-4" />
                  <span>{profile.city}</span>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">42</div>
              <div className="text-xs text-slate-400">درس مكتمل</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">85%</div>
              <div className="text-xs text-slate-400">معدل النجاح</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">A+</div>
              <div className="text-xs text-slate-400">التقدير</div>
            </div>
          </div>
          </div>
        </div>
      </SettingsCard>
      <SettingsCard delay={0.1}>
        <div className="p-4 border-b border-white/10">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <User className="h-5 w-5 text-indigo-400" />
            المعلومات الشخصية
          </h3>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid sm:grid-cols-2 gap-6">
            <SettingsInput
              id="firstName"
              label="الاسم الأول"
              icon={User}
              value={profile.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              disabled={!isEditing}
              placeholder="أدخل اسمك الأول"
            />
            <SettingsInput
              id="lastName"
              label="الاسم الأخير"
              icon={User}
              value={profile.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              disabled={!isEditing}
              placeholder="أدخل اسمك الأخير"
            />
          </div>
          
          <div className="grid sm:grid-cols-2 gap-6">
            <SettingsInput
              id="email"
              label="البريد الإلكتروني"
              icon={Mail}
              type="email"
              value={profile.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              disabled={true}
              placeholder="example@email.com"
              hint="لا يمكن تغيير البريد الإلكتروني"
            />
            <SettingsInput
              id="phone"
              label="رقم الهاتف"
              icon={Phone}
              type="tel"
              value={profile.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              disabled={!isEditing}
              placeholder="+966 5XX XXX XXXX"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <SettingsInput
              id="birthDate"
              label="تاريخ الميلاد"
              icon={Calendar}
              type="date"
              value={profile.birthDate}
              onChange={(e) => handleInputChange('birthDate', e.target.value)}
              disabled={!isEditing}
            />
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">الجنس</label>
              <div className="flex gap-4">
                <label className={cn(
                  'flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all',
                  profile.gender === 'male'
                    ? 'bg-indigo-500/20 border-indigo-500/50 text-white'
                    : 'bg-white/5 border-white/10 text-slate-400',
                  !isEditing && 'cursor-not-allowed opacity-60'
                )}>
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    checked={profile.gender === 'male'}
                    onChange={() => handleInputChange('gender', 'male')}
                    disabled={!isEditing}
                    className="hidden"
                  />
                  <span>ذكر</span>
                </label>
                <label className={cn(
                  'flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all',
                  profile.gender === 'female'
                    ? 'bg-pink-500/20 border-pink-500/50 text-white'
                    : 'bg-white/5 border-white/10 text-slate-400',
                  !isEditing && 'cursor-not-allowed opacity-60'
                )}>
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    checked={profile.gender === 'female'}
                    onChange={() => handleInputChange('gender', 'female')}
                    disabled={!isEditing}
                    className="hidden"
                  />
                  <span>أنثى</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </SettingsCard>

      {/* Academic Information */}
      <SettingsCard delay={0.2}>
        <div className="p-4 border-b border-white/10">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-indigo-400" />
            المعلومات الدراسية
          </h3>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid sm:grid-cols-2 gap-6">
            <SettingsInput
              id="school"
              label="المدرسة"
              icon={Building2}
              value={profile.school}
              onChange={(e) => handleInputChange('school', e.target.value)}
              disabled={!isEditing}
              placeholder="اسم المدرسة"
            />
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">الصف الدراسي</label>
              <select
                value={profile.grade}
                onChange={(e) => handleInputChange('grade', e.target.value)}
                disabled={!isEditing}
                className={cn(
                  'w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50',
                  'disabled:opacity-60 disabled:cursor-not-allowed'
                )}
              >
                {grades.map(grade => (
                  <option key={grade.value} value={grade.value} className="bg-slate-800">
                    {grade.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <SettingsInput
            id="city"
            label="المدينة"
            icon={MapPin}
            value={profile.city}
            onChange={(e) => handleInputChange('city', e.target.value)}
            disabled={!isEditing}
            placeholder="اسم المدينة"
          />
        </div>
      </SettingsCard>

      {/* Bio */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden"
      >
        <div className="p-4 border-b border-white/10">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Award className="h-5 w-5 text-indigo-400" />
            نبذة عني
          </h3>
        </div>
        
        <div className="p-6">
          <textarea
            value={profile.bio}
            onChange={(e) => handleInputChange('bio', e.target.value)}
            disabled={!isEditing}
            placeholder="اكتب نبذة قصيرة عن نفسك..."
            rows={4}
            className={cn(
              'w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 resize-none',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50',
              'disabled:opacity-60 disabled:cursor-not-allowed'
            )}
          />
          <p className="text-xs text-slate-500 mt-2">
            {profile.bio.length}/500 حرف
          </p>
        </div>
      </motion.div>
      </div>
    </AuthGuard>
  );
}
