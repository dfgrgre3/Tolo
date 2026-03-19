'use client';

/**
 * 👤 صفحة الملف الشخصي - Profile Settings
 * 
 * الصفحة الرئيسية للإعدادات مع تحديث شامل للبيانات الشخصية والدراسية والمهنية.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';

import {
  User,
  Mail,
  Phone,
  Calendar,
  Camera,
  Loader2,
  Edit3,
  Save,
  X,
  GraduationCap,
  Building2,
  Award,
  Globe,
  Briefcase,
  BookOpen,
  CheckCircle,
  Hash,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { SettingsHeader, SettingsInput, SettingsCard } from './components';

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  alternativePhone: string;
  birthDate: string;
  gender: string;
  country: string;
  city: string;
  school: string;
  gradeLevel: string;
  educationType: string;
  section: string;
  studyGoal: string;
  bio: string;
  avatar: string;
  // Teacher specific
  subjectsTaught: string[];
  experienceYears: string;
}

const educationTypes = [
  { value: 'GENERAL', label: 'ثانوية عامة (عام)' },
  { value: 'STEM', label: 'ثانوية STEM' },
  { value: 'AZHAR', label: 'ثانوية أزهرية' },
  { value: 'TECHNICAL', label: 'ثانوية فنية' },
];

const sections = [
  { value: 'SCIENCE_BIO', label: 'علمي علوم' },
  { value: 'SCIENCE_MATH', label: 'علمي رياضة' },
  { value: 'LITERARY', label: 'أدبي' },
  { value: 'NONE', label: 'غير محدد' },
];

const gradeLevels = [
  { value: '1_SEC', label: 'الصف الأول الثانوي' },
  { value: '2_SEC', label: 'الصف الثاني الثانوي' },
  { value: '3_SEC', label: 'الصف الثالث الثانوي' },
];

const initialProfile: ProfileData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  alternativePhone: '',
  birthDate: '',
  gender: 'male',
  country: 'مصر',
  city: '',
  school: '',
  gradeLevel: '3_SEC',
  educationType: 'GENERAL',
  section: 'SCIENCE_BIO',
  studyGoal: '',
  bio: '',
  avatar: '',
  subjectsTaught: [],
  experienceYears: '',
};

export default function ProfileSettingsPage() {
  const { user, isLoading, refreshUser, fetchWithAuth } = useAuth();
  const [profile, setProfile] = useState<ProfileData>(initialProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync profile state with user data
  useEffect(() => {
    if (user) {
      setProfile({
        firstName: user.name?.split(' ')[0] || '',
        lastName: user.name?.split(' ').slice(1).join(' ') || '',
        email: user.email || '',
        phone: user.phone || '',
        alternativePhone: (user as any).alternativePhone || '',
        birthDate: user.birthDate ? new Date(user.birthDate).toISOString().split('T')[0] : '',
        gender: user.gender || 'male',
        country: (user as any).country || 'مصر',
        city: (user as any).city || '',
        school: (user as any).school || '',
        gradeLevel: (user as any).gradeLevel || '3_SEC',
        educationType: (user as any).educationType || 'GENERAL',
        section: (user as any).section || 'SCIENCE_BIO',
        studyGoal: (user as any).studyGoal || '',
        bio: (user as any).bio || '',
        avatar: user.avatar || '',
        subjectsTaught: (user as any).subjectsTaught || [],
        experienceYears: (user as any).experienceYears || '',
      });
    }
  }, [user]);

  const handleInputChange = (field: keyof ProfileData, value: any) => {
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
    
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfile(prev => ({ ...prev, avatar: event.target?.result as string }));
        setIsUploadingAvatar(false);
        toast.success('تمت معاينة الصورة بنجاح (احفظ التغييرات لاعتمادها)');
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setIsUploadingAvatar(false);
      toast.error('فشل تحميل الصورة');
    }
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: `${profile.firstName} ${profile.lastName}`.trim(),
          phone: profile.phone,
          alternativePhone: profile.alternativePhone,
          birthDate: profile.birthDate,
          gender: profile.gender,
          country: profile.country,
          school: profile.school,
          gradeLevel: profile.gradeLevel,
          educationType: profile.educationType,
          section: profile.section,
          studyGoal: profile.studyGoal,
          bio: profile.bio,
          avatar: profile.avatar,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'فشل حفظ التغييرات');
      }
      
      await refreshUser();
      toast.success('تم حفظ التغييرات بنجاح');
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const isTeacher = user.role === 'TEACHER';

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      {/* Header */}
      <SettingsHeader
        icon={User}
        title="الملف الشخصي"
        description="إدارة معلوماتك الشخصية وتحديث بياناتك"
        actionButton={
          !isEditing
            ? {
                label: 'تعديل الملف',
                onClick: () => setIsEditing(true),
                variant: 'primary',
                icon: Edit3,
              }
            : {
                label: 'حفظ التغييرات',
                onClick: handleSave,
                loading: isSaving,
                variant: 'primary',
                icon: Save,
              }
        }
      />
      
      {isEditing && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-end"
        >
          <button
            onClick={() => setIsEditing(false)}
            className="flex items-center gap-2 px-6 py-2 rounded-xl bg-white/5 text-slate-300 font-medium hover:bg-white/10 hover:text-white transition-all border border-white/10"
          >
            <X className="h-4 w-4" />
            إلغاء التعديل
          </button>
        </motion.div>
      )}

      {/* Hero / Avatar Section */}
      <SettingsCard gradient delay={0}>
        <div className="p-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative group">
              <div className="h-32 w-32 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-1 shadow-lg shadow-indigo-500/20">
                <div className="h-full w-full rounded-full bg-slate-900 flex items-center justify-center overflow-hidden border-2 border-slate-900/50">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-16 w-16 text-slate-600" />
                  )}
                </div>
              </div>
              
              {isEditing && (
                <button
                  onClick={handleAvatarClick}
                  disabled={isUploadingAvatar}
                  className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Camera className="h-6 w-6 text-white" />
                      <span className="text-[10px] text-white font-medium">تغيير الصورة</span>
                    </div>
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

            <div className="text-center md:text-right flex-1 space-y-2">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <h2 className="text-3xl font-bold text-white tracking-tight">
                  {profile.firstName} {profile.lastName}
                </h2>
                <span className={cn(
                  "inline-flex w-fit mx-auto md:mx-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                  isTeacher ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                )}>
                  {isTeacher ? 'مدرس' : 'طالب'}
                </span>
              </div>
              <p className="text-slate-400 font-medium">{profile.email}</p>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                  <GraduationCap className="h-3.5 w-3.5 text-indigo-400" />
                  <span>{gradeLevels.find(g => g.value === profile.gradeLevel)?.label || 'غير محدد'}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 pt-4 md:pt-0 border-t md:border-t-0 md:border-r border-white/10 md:pr-8">
              <div className="text-center group">
                <div className="text-2xl font-bold text-white group-hover:text-indigo-400 transition-colors">{user.totalXP || 0}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">نقطة خبرة</div>
              </div>
              <div className="text-center group">
                <div className="text-2xl font-bold text-white group-hover:text-purple-400 transition-colors">{user.level || 1}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">المستوى</div>
              </div>
              <div className="text-center group">
                <div className="text-2xl font-bold text-orange-400 group-hover:scale-110 transition-transform">{user.currentStreak || 0}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">أيام متتالية</div>
              </div>
            </div>
          </div>
        </div>
      </SettingsCard>

      {/* Main Info */}
      <SettingsCard delay={0.1}>
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <User className="h-5 w-5 text-indigo-400" />
            المعلومات الأساسية
          </h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">المعلومات الشخصية</p>
        </div>
        
        <div className="p-8 space-y-8">
          <div className="grid sm:grid-cols-2 gap-8">
            <SettingsInput
              id="firstName"
              label="الاسم الأول"
              icon={User}
              value={profile.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              disabled={!isEditing}
              placeholder="مثال: أحمد"
            />
            <SettingsInput
              id="lastName"
              label="الاسم الأخير"
              icon={User}
              value={profile.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              disabled={!isEditing}
              placeholder="مثال: محمد"
            />
          </div>
          
          <div className="grid sm:grid-cols-2 gap-8">
            <SettingsInput
              id="email"
              label="البريد الإلكتروني"
              icon={Mail}
              type="email"
              value={profile.email}
              disabled={true}
              hint="لا يمكن تعديل البريد الإلكتروني الأساسي"
            />
            <SettingsInput
              id="phone"
              label="رقم الهاتف الأساسي"
              icon={Phone}
              type="tel"
              value={profile.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              disabled={!isEditing}
              placeholder="01xxxxxxxxx"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-8">
            <SettingsInput
              id="alternativePhone"
              label="رقم هاتف الطوارئ"
              icon={Phone}
              type="tel"
              value={profile.alternativePhone}
              onChange={(e) => handleInputChange('alternativePhone', e.target.value)}
              disabled={!isEditing}
              placeholder="01xxxxxxxxx"
              hint="رقم هاتف لولي الأمر أو للطوارئ"
            />
            <SettingsInput
              id="birthDate"
              label="تاريخ الميلاد"
              icon={Calendar}
              type="date"
              value={profile.birthDate}
              onChange={(e) => handleInputChange('birthDate', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-300">الجنس</label>
              <div className="flex gap-4">
                {['male', 'female'].map((g) => (
                  <button
                    key={g}
                    type="button"
                    disabled={!isEditing}
                    onClick={() => handleInputChange('gender', g)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-3 p-3.5 rounded-2xl border transition-all duration-300 font-medium capitalize',
                      profile.gender === g
                        ? g === 'male' 
                          ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 shadow-inner shadow-indigo-500/10'
                          : 'bg-pink-500/20 border-pink-500/50 text-pink-300 shadow-inner shadow-pink-500/10'
                        : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10',
                      !isEditing && 'opacity-60 cursor-not-allowed'
                    )}
                  >
                    <CheckCircle className={cn("h-4 w-4", profile.gender === g ? "opacity-100" : "opacity-0")} />
                    {g === 'male' ? 'ذكر' : 'أنثى'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <SettingsInput
                id="country"
                label="الدولة"
                icon={Globe}
                value={profile.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                disabled={!isEditing}
                placeholder="مصر"
              />
            </div>
          </div>
        </div>
      </SettingsCard>

      {/* Academic / Professional Info */}
      <SettingsCard delay={0.2}>
        <div className="p-5 border-b border-white/10">
          <h3 className="font-semibold text-white flex items-center gap-2">
            {isTeacher ? <Briefcase className="h-5 w-5 text-indigo-400" /> : <GraduationCap className="h-5 w-5 text-indigo-400" />}
            {isTeacher ? 'المعلومات المهنية' : 'المعلومات الدراسية'}
          </h3>
        </div>
        
        <div className="p-8 space-y-8">
          {!isTeacher ? (
            <>
              <div className="grid sm:grid-cols-2 gap-8">
                <SettingsInput
                  id="school"
                  label="المدرسة / المعهد"
                  icon={Building2}
                  value={profile.school}
                  onChange={(e) => handleInputChange('school', e.target.value)}
                  disabled={!isEditing}
                  placeholder="اسم مدرستك الحالية"
                />
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-300">الصف الدراسي</label>
                  <select
                    value={profile.gradeLevel}
                    onChange={(e) => handleInputChange('gradeLevel', e.target.value)}
                    disabled={!isEditing}
                    className={cn(
                      'w-full p-4 rounded-2xl bg-slate-800/50 border border-white/10 text-white shadow-lg',
                      'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all',
                      'disabled:opacity-60 disabled:cursor-not-allowed'
                    )}
                  >
                    {gradeLevels.map(grade => (
                      <option key={grade.value} value={grade.value}>{grade.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-300">نوع التعليم</label>
                  <select
                    value={profile.educationType}
                    onChange={(e) => handleInputChange('educationType', e.target.value)}
                    disabled={!isEditing}
                    className={cn(
                      'w-full p-4 rounded-2xl bg-slate-800/50 border border-white/10 text-white',
                      'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all disabled:opacity-60'
                    )}
                  >
                    {educationTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-300">الشعبة / التخصص</label>
                  <select
                    value={profile.section}
                    onChange={(e) => handleInputChange('section', e.target.value)}
                    disabled={!isEditing}
                    className={cn(
                      'w-full p-4 rounded-2xl bg-slate-800/50 border border-white/10 text-white',
                      'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all disabled:opacity-60'
                    )}
                  >
                    {sections.map(sec => (
                      <option key={sec.value} value={sec.value}>{sec.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <SettingsInput
                id="studyGoal"
                label="هدفك الدراسي"
                icon={Award}
                value={profile.studyGoal}
                onChange={(e) => handleInputChange('studyGoal', e.target.value)}
                disabled={!isEditing}
                placeholder="مثال: دخول كلية الهندسة"
                hint="سيساعدنا هذا في توفير محتوى تعليمي مخصص لك"
              />
            </>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-300">المواد التي تدرسها</label>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-indigo-300 text-sm font-medium flex flex-wrap gap-2 min-h-[58px]">
                    {profile.subjectsTaught.length > 0 ? (
                      profile.subjectsTaught.map((sub, i) => (
                        <span key={i} className="bg-indigo-500/20 px-2 py-1 rounded-md border border-indigo-500/30">
                          {sub}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500 italic">لم يتم تحديد مواد</span>
                    )}
                  </div>
                </div>
                <SettingsInput
                  id="experienceYears"
                  label="سنوات الخبرة"
                  icon={Hash}
                  value={profile.experienceYears}
                  onChange={(e) => handleInputChange('experienceYears', e.target.value)}
                  disabled={!isEditing}
                  placeholder="مثال: 10 سنوات"
                />
              </div>
            </>
          )}
        </div>
      </SettingsCard>

      {/* Bio / About */}
      <SettingsCard delay={0.3}>
        <div className="p-5 border-b border-white/10">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-400" />
            نبذة تعريفية
          </h3>
        </div>
        
        <div className="p-8">
          <div className="relative">
            <textarea
              id="bio"
              value={profile.bio}
              onChange={(e) => handleInputChange('bio', e.target.value.slice(0, 500))}
              disabled={!isEditing}
              placeholder="اكتب نبذة عن اهتماماتك أو أهدافك..."
              rows={4}
              className={cn(
                'w-full p-5 rounded-2xl bg-slate-800/50 border border-white/10 text-white placeholder:text-slate-600 resize-none font-medium leading-relaxed shadow-lg',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all',
                'disabled:opacity-60 disabled:cursor-not-allowed'
              )}
            />
            <div className="absolute bottom-4 left-4">
              <span className={cn(
                "text-xs font-bold font-mono px-2 py-1 rounded-md",
                profile.bio.length >= 450 ? "bg-red-500/20 text-red-400" : "bg-white/5 text-slate-500"
              )}>
                {profile.bio.length} / 500
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4 leading-relaxed font-medium">
            ستظهر هذه النبذة في ملفك الشخصي العام وفي مجتمعات النقاش الخاصة بالمناهج.
          </p>
        </div>
      </SettingsCard>

      {/* Help Panel */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-600/10 to-purple-600/10 border border-indigo-500/20 flex flex-col md:flex-row items-center gap-6">
        <div className="bg-indigo-500/20 p-4 rounded-xl">
          <Building2 className="h-8 w-8 text-indigo-400" />
        </div>
        <div className="flex-1 text-right">
          <h4 className="text-white font-bold text-lg mb-1">خصوصية بياناتك</h4>
          <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">
            نحن نهتم بخصوصيتك. البيانات الأكاديمية مثل المدرسة والشعبة تستخدم فقط لتحسين تجربتك التعليمية وتوفير الدروس المناسبة لمنهجك. يمكنك إدارة ظهور هذه البيانات من صفحة <Link href="/settings/privacy" className="text-indigo-400 hover:underline">الخصوصية</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
