import { User, Mail, Phone, Calendar, AtSign, Globe, MapPin, RefreshCw, CheckCircle } from 'lucide-react';
import { SettingsCard } from '../components';
import { cn } from '@/lib/utils';
import { ProfileInput } from './profile-input';
import { ProfileSelect } from './profile-select';
import type { ProfileData } from './profile-data';
import { countries } from './profile-data';

export function PersonalInfoForm({
  profile,
  isEditing,
  hasChanges,
  onInputChange
}: {
  profile: ProfileData;
  isEditing: boolean;
  hasChanges: boolean;
  onInputChange: <K extends keyof ProfileData>(field: K, value: ProfileData[K]) => void;
}) {
  return (
    <SettingsCard delay={0.1}>
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <User className="h-5 w-5 text-indigo-400" />
          المعلومات الأساسية
        </h3>
        {isEditing && hasChanges && (
          <span className="text-xs text-amber-400 font-medium flex items-center gap-1">
            <RefreshCw className="h-3 w-3" />
            يوجد تغييرات غير محفوظة
          </span>
        )}
      </div>

      <div className="p-6 space-y-6">
        <div className="grid sm:grid-cols-2 gap-6">
          <ProfileInput id="firstName" label="الاسم الأول" icon={User} value={profile.firstName} onChange={(e) => onInputChange('firstName', e.target.value)} disabled={!isEditing} placeholder="مثال: أحمد" required />
          <ProfileInput id="lastName" label="الاسم الأخير" icon={User} value={profile.lastName} onChange={(e) => onInputChange('lastName', e.target.value)} disabled={!isEditing} placeholder="مثال: محمد" />
        </div>

        <ProfileInput
          id="username"
          label="اسم المستخدم"
          icon={AtSign}
          value={profile.username}
          onChange={(e) => onInputChange('username', e.target.value)}
          disabled={!isEditing}
          placeholder="اسم_المستخدم"
          hint="يظهر في ملفك الشخصي العام ولا يمكن أن يحتوي على مسافات"
        />

        <div className="grid sm:grid-cols-2 gap-6">
          <ProfileInput id="email" label="البريد الإلكتروني" icon={Mail} type="email" value={profile.email} disabled={true} hint="لا يمكن تعديل البريد الإلكتروني الأساسي" />
          <ProfileInput id="phone" label="رقم الهاتف الأساسي" icon={Phone} type="tel" value={profile.phone} onChange={(e) => onInputChange('phone', e.target.value)} disabled={!isEditing} placeholder="01xxxxxxxxx" />
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <ProfileInput
            id="alternativePhone"
            label="هاتف الطوارئ / ولي الأمر"
            icon={Phone}
            type="tel"
            value={profile.alternativePhone}
            onChange={(e) => onInputChange('alternativePhone', e.target.value)}
            disabled={!isEditing}
            placeholder="01xxxxxxxxx"
            hint="رقم هاتف لولي الأمر أو للطوارئ"
          />
          <ProfileInput id="birthDate" label="تاريخ الميلاد" icon={Calendar} type="date" value={profile.birthDate} onChange={(e) => onInputChange('birthDate', e.target.value)} disabled={!isEditing} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-300">الجنس</label>
          <div className="flex gap-3">
            {[
              { value: 'male', label: '👨 ذكر', activeColor: 'bg-blue-500/20 border-blue-500/50 text-blue-300' },
              { value: 'female', label: '👩 أنثى', activeColor: 'bg-pink-500/20 border-pink-500/50 text-pink-300' },
            ].map((g) => (
              <button
                key={g.value}
                type="button"
                disabled={!isEditing}
                onClick={() => onInputChange('gender', g.value)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 p-3.5 rounded-2xl border transition-all font-semibold',
                  profile.gender === g.value ? g.activeColor : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10',
                  !isEditing && 'opacity-60 cursor-not-allowed'
                )}
              >
                {profile.gender === g.value && <CheckCircle className="h-4 w-4" />}
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <ProfileSelect id="country" label="الدولة" icon={Globe} value={profile.country} onChange={(e) => onInputChange('country', e.target.value)} disabled={!isEditing} options={countries.map((c) => ({ value: c, label: c }))} />
          <ProfileInput id="city" label="المدينة" icon={MapPin} value={profile.city} onChange={(e) => onInputChange('city', e.target.value)} disabled={!isEditing} placeholder="مثال: القاهرة" />
        </div>
      </div>
    </SettingsCard>
  );
}
