'use client';

/**
 * 👤 صفحة الملف الشخصي - Profile Settings (متطورة ومتكاملة)
 *
 * الصفحة الرئيسية للإعدادات مع تحديث شامل للبيانات الشخصية والدراسية والمهنية.
 * مرتبطة بالكامل مع API وبيانات المستخدم الحقيقية.
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
  Star,
  Flame,
  Trophy,
  MapPin,

  Shield,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  AtSign,
  Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { SettingsCard } from './components';

interface ProfileData {
  firstName: string;
  lastName: string;
  username: string;
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
  subjectsTaught: string[];
  experienceYears: string;
}

const educationTypes = [
{ value: 'GENERAL', label: 'ثانوية عامة (عام)' },
{ value: 'STEM', label: 'ثانوية STEM' },
{ value: 'AZHAR', label: 'ثانوية أزهرية' },
{ value: 'TECHNICAL', label: 'ثانوية فنية' },
{ value: 'INTERNATIONAL', label: 'دولي / IG' }];


const sections = [
{ value: 'SCIENCE_BIO', label: 'علمي علوم' },
{ value: 'SCIENCE_MATH', label: 'علمي رياضة' },
{ value: 'LITERARY', label: 'أدبي' },
{ value: 'NONE', label: 'غير محدد' }];


const gradeLevels = [
{ value: '1_PREP', label: 'الصف الأول الإعدادي' },
{ value: '2_PREP', label: 'الصف الثاني الإعدادي' },
{ value: '3_PREP', label: 'الصف الثالث الإعدادي' },
{ value: '1_SEC', label: 'الصف الأول الثانوي' },
{ value: '2_SEC', label: 'الصف الثاني الثانوي' },
{ value: '3_SEC', label: 'الصف الثالث الثانوي' }];


const countries = [
'مصر', 'السعودية', 'الإمارات', 'الكويت', 'قطر', 'البحرين', 'عُمان',
'الأردن', 'لبنان', 'سوريا', 'العراق', 'اليمن', 'ليبيا', 'تونس',
'الجزائر', 'المغرب', 'السودان', 'غيرها'];


const initialProfile: ProfileData = {
  firstName: '',
  lastName: '',
  username: '',
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
  experienceYears: ''
};

// منطقة عدادات الإحصائيات
function StatBadge({
  icon: Icon,
  value,
  label,
  color





}: {icon: any;value: string | number;label: string;color: string;}) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors cursor-default">
      
      <div className={cn('flex items-center justify-center gap-1.5', color)}>
        <Icon className="h-4 w-4" />
        <span className="text-lg font-black">{value}</span>
      </div>
      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{label}</span>
    </motion.div>);

}

// حقل مدخل مخصص
function ProfileInput({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  disabled,
  type = 'text',
  placeholder,
  hint,
  required











}: {id: string;label: string;icon?: any;value: string;onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;disabled?: boolean;type?: string;placeholder?: string;hint?: string;required?: boolean;}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="flex items-center gap-1.5 text-sm font-semibold text-slate-300">
        {required && <span className="text-red-400 text-xs">*</span>}
        {label}
      </label>
      <div className="relative group">
        {Icon &&
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <Icon className={cn(
            'h-4 w-4 transition-colors',
            disabled ? 'text-slate-600' : 'text-slate-500 group-focus-within:text-indigo-400'
          )} />
          </div>
        }
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            'w-full py-3.5 rounded-2xl bg-slate-800/50 border border-white/10 text-white',
            'placeholder:text-slate-600 transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50',
            'disabled:opacity-60 disabled:cursor-not-allowed',
            Icon ? 'pr-11 pl-4' : 'px-4'
          )} />
        
      </div>
      {hint &&
      <p className="text-xs text-slate-500 flex items-start gap-1.5">
          <span className="mt-0.5 h-1 w-1 rounded-full bg-slate-600 shrink-0" />
          {hint}
        </p>
      }
    </div>);

}

// حقل اختيار مخصص
function ProfileSelect({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  disabled,
  options








}: {id: string;label: string;icon?: any;value: string;onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;disabled?: boolean;options: {value: string;label: string;}[];}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-semibold text-slate-300">{label}</label>
      <div className="relative group">
        {Icon &&
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10">
            <Icon className={cn(
            'h-4 w-4 transition-colors',
            disabled ? 'text-slate-600' : 'text-slate-500 group-focus-within:text-indigo-400'
          )} />
          </div>
        }
        <select
          id={id}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={cn(
            'w-full py-3.5 rounded-2xl bg-slate-800/50 border border-white/10 text-white appearance-none',
            'transition-all duration-200 cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50',
            'disabled:opacity-60 disabled:cursor-not-allowed',
            Icon ? 'pr-11 pl-4' : 'px-4'
          )}>
          
          {options.map((option) =>
          <option key={option.value} value={option.value} className="bg-slate-800">
              {option.label}
            </option>
          )}
        </select>
      </div>
    </div>);

}

export default function ProfileSettingsPage() {
  const { user, isLoading, refreshUser } = useAuth();
  const [profile, setProfile] = useState<ProfileData>(initialProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // مزامنة بيانات المستخدم
  useEffect(() => {
    if (user) {
      const dateOfBirth = user.dateOfBirth || user.birthDate;
      setProfile({
        firstName: user.name?.split(' ')[0] || '',
        lastName: user.name?.split(' ').slice(1).join(' ') || '',
        username: user.username || '',
        email: user.email || '',
        phone: user.phone || '',
        alternativePhone: user.alternativePhone || '',
        birthDate: dateOfBirth ? new Date(dateOfBirth).toISOString().split('T')[0] : '',
        gender: user.gender || 'male',
        country: user.country || 'مصر',
        city: user.city || '',
        school: user.school || '',
        gradeLevel: user.gradeLevel || '3_SEC',
        educationType: user.educationType || 'GENERAL',
        section: user.section || 'SCIENCE_BIO',
        studyGoal: user.studyGoal || '',
        bio: user.bio || '',
        avatar: user.avatar || '',
        subjectsTaught: user.subjectsTaught || [],
        experienceYears: user.experienceYears || ''
      });
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
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // إعادة تعيين البيانات للحالة الأصلية
    if (user) {
      const dateOfBirth = user.dateOfBirth || user.birthDate;
      setProfile({
        firstName: user.name?.split(' ')[0] || '',
        lastName: user.name?.split(' ').slice(1).join(' ') || '',
        username: user.username || '',
        email: user.email || '',
        phone: user.phone || '',
        alternativePhone: user.alternativePhone || '',
        birthDate: dateOfBirth ? new Date(dateOfBirth).toISOString().split('T')[0] : '',
        gender: user.gender || 'male',
        country: user.country || 'مصر',
        city: user.city || '',
        school: user.school || '',
        gradeLevel: user.gradeLevel || '3_SEC',
        educationType: user.educationType || 'GENERAL',
        section: user.section || 'SCIENCE_BIO',
        studyGoal: user.studyGoal || '',
        bio: user.bio || '',
        avatar: user.avatar || '',
        subjectsTaught: user.subjectsTaught || [],
        experienceYears: user.experienceYears || ''
      });
    }
    setIsEditing(false);
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
          <p className="text-sm text-slate-400">جاري تحميل بياناتك...</p>
        </div>
      </div>);

  }

  if (!user) return null;

  const isTeacher = user.role === 'TEACHER';
  const userInitial = user.name ?
  user.name.charAt(0).toUpperCase() :
  user.email.charAt(0).toUpperCase();

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20">
              <User className="h-5 w-5 text-indigo-400" />
            </div>
            الملف الشخصي
          </h1>
          <p className="text-sm text-slate-400 mt-1 mr-14">إدارة معلوماتك الشخصية وتحديث بياناتك</p>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ?
          <>
              <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-slate-300 font-medium hover:bg-white/10 hover:text-white transition-all border border-white/10">
              
                <X className="h-4 w-4" />
                إلغاء
              </motion.button>
              <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium transition-all disabled:opacity-50 shadow-lg shadow-green-500/20">
              
                {isSaving ?
              <Loader2 className="h-4 w-4 animate-spin" /> :

              <Save className="h-4 w-4" />
              }
                {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </motion.button>
            </> :

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-medium hover:bg-indigo-500/30 transition-all">
            
              <Edit3 className="h-4 w-4" />
              تعديل الملف
            </motion.button>
          }
        </div>
      </div>

      {/* Email verification warning */}
      {!user.emailVerified &&
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-3 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20">
        
          <AlertCircle className="h-5 w-5 text-orange-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-300">البريد الإلكتروني غير مفعّل</p>
            <p className="text-xs text-orange-400/70 mt-1">
              لم يتم تفعيل بريدك الإلكتروني. تحقق من بريدك الوارد للعثور على رابط التفعيل.
            </p>
          </div>
        </motion.div>
      }

      {/* Hero / Avatar Section */}
      <SettingsCard gradient delay={0}>
        <div className="p-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Avatar */}
            <div className="relative group">
              <div className="h-28 w-28 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-1 shadow-xl shadow-indigo-500/30">
                <div className="h-full w-full rounded-full bg-slate-900 flex items-center justify-center overflow-hidden border-2 border-slate-900/50">
                  {profile.avatar ?
                  <img src={profile.avatar} alt="Avatar" className="h-full w-full object-cover" /> :

                  <span className="text-4xl font-black text-white">{userInitial}</span>
                  }
                </div>
              </div>

              {isEditing &&
              <button
                onClick={handleAvatarClick}
                disabled={isUploadingAvatar}
                className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300">
                
                  {isUploadingAvatar ?
                <Loader2 className="h-8 w-8 text-white animate-spin" /> :

                <div className="flex flex-col items-center gap-1">
                      <Camera className="h-6 w-6 text-white" />
                      <span className="text-[10px] text-white font-bold">تغيير</span>
                    </div>
                }
                </button>
              }

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden" />
              
            </div>

            {/* User Info */}
            <div className="text-center md:text-right flex-1 space-y-2">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <h2 className="text-3xl font-black text-white tracking-tight">
                  {profile.firstName || profile.lastName ?
                  `${profile.firstName} ${profile.lastName}`.trim() :
                  user.username || 'المستخدم'}
                </h2>
                <span
                  className={cn(
                    'inline-flex w-fit mx-auto md:mx-0 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider',
                    isTeacher ?
                    'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                    'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                  )}>
                  
                  {isTeacher ? '🎓 مدرس' : '📚 طالب'}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-sm text-slate-400">
                {profile.email &&
                <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {profile.email}
                  </span>
                }
                {profile.phone &&
                <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    {profile.phone}
                  </span>
                }
              </div>

              {profile.bio &&
              <p className="text-sm text-slate-400 max-w-lg leading-relaxed">{profile.bio}</p>
              }
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <StatBadge icon={Star} value={user.totalXP || 0} label="نقطة XP" color="text-yellow-400" />
              <StatBadge icon={Trophy} value={user.level || 1} label="مستوى" color="text-indigo-400" />
              <StatBadge icon={Flame} value={user.currentStreak || 0} label="تسلسل" color="text-orange-400" />
            </div>
          </div>
        </div>
      </SettingsCard>

      {/* Main Personal Info */}
      <SettingsCard delay={0.1}>
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <User className="h-5 w-5 text-indigo-400" />
            المعلومات الأساسية
          </h3>
          {isEditing && hasChanges &&
          <span className="text-xs text-amber-400 font-medium flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              يوجد تغييرات غير محفوظة
            </span>
          }
        </div>

        <div className="p-6 space-y-6">
          {/* Name */}
          <div className="grid sm:grid-cols-2 gap-6">
            <ProfileInput
              id="firstName"
              label="الاسم الأول"
              icon={User}
              value={profile.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              disabled={!isEditing}
              placeholder="مثال: أحمد"
              required />
            
            <ProfileInput
              id="lastName"
              label="الاسم الأخير"
              icon={User}
              value={profile.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              disabled={!isEditing}
              placeholder="مثال: محمد" />
            
          </div>

          {/* Username */}
          <ProfileInput
            id="username"
            label="اسم المستخدم"
            icon={AtSign}
            value={profile.username}
            onChange={(e) => handleInputChange('username', e.target.value)}
            disabled={!isEditing}
            placeholder="اسم_المستخدم"
            hint="يظهر في ملفك الشخصي العام ولا يمكن أن يحتوي على مسافات" />
          

          {/* Email & Phone */}
          <div className="grid sm:grid-cols-2 gap-6">
            <ProfileInput
              id="email"
              label="البريد الإلكتروني"
              icon={Mail}
              type="email"
              value={profile.email}
              disabled={true}
              hint="لا يمكن تعديل البريد الإلكتروني الأساسي" />
            
            <ProfileInput
              id="phone"
              label="رقم الهاتف الأساسي"
              icon={Phone}
              type="tel"
              value={profile.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              disabled={!isEditing}
              placeholder="01xxxxxxxxx" />
            
          </div>

          {/* Alt Phone & Birthdate */}
          <div className="grid sm:grid-cols-2 gap-6">
            <ProfileInput
              id="alternativePhone"
              label="هاتف الطوارئ / ولي الأمر"
              icon={Phone}
              type="tel"
              value={profile.alternativePhone}
              onChange={(e) => handleInputChange('alternativePhone', e.target.value)}
              disabled={!isEditing}
              placeholder="01xxxxxxxxx"
              hint="رقم هاتف لولي الأمر أو للطوارئ" />
            
            <ProfileInput
              id="birthDate"
              label="تاريخ الميلاد"
              icon={Calendar}
              type="date"
              value={profile.birthDate}
              onChange={(e) => handleInputChange('birthDate', e.target.value)}
              disabled={!isEditing} />
            
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300">الجنس</label>
            <div className="flex gap-3">
              {[
              { value: 'male', label: '👨 ذكر', activeColor: 'bg-blue-500/20 border-blue-500/50 text-blue-300' },
              { value: 'female', label: '👩 أنثى', activeColor: 'bg-pink-500/20 border-pink-500/50 text-pink-300' }].
              map((g) =>
              <button
                key={g.value}
                type="button"
                disabled={!isEditing}
                onClick={() => handleInputChange('gender', g.value)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 p-3.5 rounded-2xl border transition-all font-semibold',
                  profile.gender === g.value ?
                  g.activeColor :
                  'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10',
                  !isEditing && 'opacity-60 cursor-not-allowed'
                )}>
                
                  {profile.gender === g.value && <CheckCircle className="h-4 w-4" />}
                  {g.label}
                </button>
              )}
            </div>
          </div>

          {/* Country & City */}
          <div className="grid sm:grid-cols-2 gap-6">
            <ProfileSelect
              id="country"
              label="الدولة"
              icon={Globe}
              value={profile.country}
              onChange={(e) => handleInputChange('country', e.target.value)}
              disabled={!isEditing}
              options={countries.map((c) => ({ value: c, label: c }))} />
            
            <ProfileInput
              id="city"
              label="المدينة"
              icon={MapPin}
              value={profile.city}
              onChange={(e) => handleInputChange('city', e.target.value)}
              disabled={!isEditing}
              placeholder="مثال: القاهرة" />
            
          </div>
        </div>
      </SettingsCard>

      {/* Academic / Professional Info */}
      <SettingsCard delay={0.2}>
        <div className="p-5 border-b border-white/10">
          <h3 className="font-semibold text-white flex items-center gap-2">
            {isTeacher ?
            <Briefcase className="h-5 w-5 text-indigo-400" /> :

            <GraduationCap className="h-5 w-5 text-indigo-400" />
            }
            {isTeacher ? 'المعلومات المهنية' : 'المعلومات الدراسية'}
          </h3>
        </div>

        <div className="p-6 space-y-6">
          {!isTeacher ?
          <>
              {/* School */}
              <ProfileInput
              id="school"
              label="المدرسة / المعهد"
              icon={Building2}
              value={profile.school}
              onChange={(e) => handleInputChange('school', e.target.value)}
              disabled={!isEditing}
              placeholder="اسم مدرستك الحالية" />
            

              <div className="grid sm:grid-cols-2 gap-6">
                <ProfileSelect
                id="gradeLevel"
                label="الصف الدراسي"
                icon={GraduationCap}
                value={profile.gradeLevel}
                onChange={(e) => handleInputChange('gradeLevel', e.target.value)}
                disabled={!isEditing}
                options={gradeLevels} />
              
                <ProfileSelect
                id="educationType"
                label="نوع التعليم"
                icon={BookOpen}
                value={profile.educationType}
                onChange={(e) => handleInputChange('educationType', e.target.value)}
                disabled={!isEditing}
                options={educationTypes} />
              
              </div>

              <ProfileSelect
              id="section"
              label="الشعبة / التخصص"
              icon={BookOpen}
              value={profile.section}
              onChange={(e) => handleInputChange('section', e.target.value)}
              disabled={!isEditing}
              options={sections} />
            

              <ProfileInput
              id="studyGoal"
              label="هدفك الدراسي"
              icon={Award}
              value={profile.studyGoal}
              onChange={(e) => handleInputChange('studyGoal', e.target.value)}
              disabled={!isEditing}
              placeholder="مثال: دخول كلية الهندسة"
              hint="سيساعدنا هذا في توفير محتوى تعليمي مخصص لك" />
            
            </> :

          <>
              <ProfileInput
              id="experienceYears"
              label="سنوات الخبرة"
              icon={Hash}
              value={profile.experienceYears}
              onChange={(e) => handleInputChange('experienceYears', e.target.value)}
              disabled={!isEditing}
              placeholder="مثال: 10 سنوات" />
            

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">المواد التي تدرّسها</label>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 min-h-[60px] flex flex-wrap gap-2">
                  {profile.subjectsTaught.length > 0 ?
                profile.subjectsTaught.map((sub, i) =>
                <span
                  key={i}
                  className="bg-indigo-500/20 px-3 py-1.5 rounded-lg border border-indigo-500/30 text-sm text-indigo-300 font-medium">
                  
                        {sub}
                      </span>
                ) :

                <span className="text-slate-500 italic text-sm">لم يتم تحديد مواد بعد</span>
                }
                </div>
              </div>
            </>
          }
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

        <div className="p-6">
          <div className="relative">
            <textarea
              id="bio"
              value={profile.bio}
              onChange={(e) => handleInputChange('bio', e.target.value.slice(0, 500))}
              disabled={!isEditing}
              placeholder="اكتب نبذة عن نفسك، اهتماماتك أو أهدافك..."
              rows={4}
              className={cn(
                'w-full p-4 rounded-2xl bg-slate-800/50 border border-white/10 text-white',
                'placeholder:text-slate-600 resize-none font-medium leading-relaxed',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all',
                'disabled:opacity-60 disabled:cursor-not-allowed'
              )} />
            
            <div className="absolute bottom-4 left-4">
              <span
                className={cn(
                  'text-xs font-bold font-mono px-2 py-1 rounded-md',
                  profile.bio.length >= 450 ?
                  'bg-red-500/20 text-red-400' :
                  'bg-white/5 text-slate-500'
                )}>
                
                {profile.bio.length} / 500
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3 leading-relaxed">
            ستظهر هذه النبذة في ملفك الشخصي العام وفي مجتمعات النقاش الخاصة بالمناهج.
          </p>
        </div>
      </SettingsCard>

      {/* Quick Links */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          href="/settings/security"
          className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group">
          
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
              <Shield className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">إعدادات الأمان</p>
              <p className="text-xs text-slate-500">كلمة المرور والتحقق بخطوتين</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-white transition-colors" />
        </Link>

        <Link
          href="/settings/privacy"
          className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group">
          
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10">
              <Globe className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">إعدادات الخصوصية</p>
              <p className="text-xs text-slate-500">التحكم في ظهور بياناتك</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-white transition-colors" />
        </Link>
      </div>

      {/* Info Panel */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-600/10 to-purple-600/10 border border-indigo-500/20 flex flex-col md:flex-row items-start gap-4">
        <div className="bg-indigo-500/20 p-3 rounded-xl shrink-0">
          <Shield className="h-6 w-6 text-indigo-400" />
        </div>
        <div className="flex-1">
          <h4 className="text-white font-bold mb-1">خصوصية بياناتك محمية</h4>
          <p className="text-slate-400 text-sm leading-relaxed">
            نحن نهتم بخصوصيتك. البيانات الأكاديمية مثل المدرسة والشعبة تستخدم فقط لتحسين تجربتك
            التعليمية. يمكنك إدارة ظهور هذه البيانات من{' '}
            <Link href="/settings/privacy" className="text-indigo-400 hover:text-indigo-300 transition-colors underline">
              صفحة الخصوصية
            </Link>.
          </p>
        </div>
      </div>
    </div>);

}
