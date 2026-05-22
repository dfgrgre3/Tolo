import { Star, Trophy, Flame, Mail, Phone, Camera, Loader2 } from 'lucide-react';
import { SettingsCard } from '../components';
import { cn } from '@/lib/utils';
import { StatBadge } from './stat-badge';
import type { ProfileData } from './profile-data';

export function ProfileHero({
  profile,
  user,
  isEditing,
  isUploadingAvatar,
  onAvatarClick,
  fileInputRef,
  onAvatarChange
}: {
  profile: ProfileData;
  user: { role?: string; name?: string | null | undefined; email?: string; username?: string | null; totalXP?: number; level?: number; currentStreak?: number };
  isEditing: boolean;
  isUploadingAvatar: boolean;
  onAvatarClick: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const isTeacher = user.role === 'TEACHER';
  const userInitial = user.name ? user.name.charAt(0).toUpperCase() : (user.email?.charAt(0).toUpperCase() ?? 'U');

  return (
    <SettingsCard gradient delay={0}>
      <div className="p-8">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="relative group">
            <div className="h-28 w-28 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-1 shadow-xl shadow-indigo-500/30">
              <div className="h-full w-full rounded-full bg-slate-900 flex items-center justify-center overflow-hidden border-2 border-slate-900/50">
                {profile.avatar ? <img src={profile.avatar} alt="Avatar" className="h-full w-full object-cover" /> : <span className="text-4xl font-black text-white">{userInitial}</span>}
              </div>
            </div>

            {isEditing && (
              <button
                onClick={onAvatarClick}
                disabled={isUploadingAvatar}
                className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300"
              >
                {isUploadingAvatar ? (
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Camera className="h-6 w-6 text-white" />
                    <span className="text-[10px] text-white font-bold">تغيير</span>
                  </div>
                )}
              </button>
            )}

            <input ref={fileInputRef} type="file" accept="image/*" onChange={onAvatarChange} className="hidden" />
          </div>

          <div className="text-center md:text-right flex-1 space-y-2">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <h2 className="text-3xl font-black text-white tracking-tight">
                {profile.firstName || profile.lastName ? `${profile.firstName} ${profile.lastName}`.trim() : user.username || 'المستخدم'}
              </h2>
              <span
                className={cn(
                  'inline-flex w-fit mx-auto md:mx-0 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider',
                  isTeacher ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                )}
              >
                {isTeacher ? '🎓 مدرس' : '📚 طالب'}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-sm text-slate-400">
              {profile.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {profile.email}
                </span>
              )}
              {profile.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {profile.phone}
                </span>
              )}
            </div>

            {profile.bio && <p className="text-sm text-slate-400 max-w-lg leading-relaxed">{profile.bio}</p>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <StatBadge icon={Star} value={user.totalXP || 0} label="نقطة XP" color="text-yellow-400" />
            <StatBadge icon={Trophy} value={user.level || 1} label="مستوى" color="text-indigo-400" />
            <StatBadge icon={Flame} value={user.currentStreak || 0} label="تسلسل" color="text-orange-400" />
          </div>
        </div>
      </div>
    </SettingsCard>
  );
}
