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
  onAvatarChange,
  profileCompletion = 0
}: {
  profile: ProfileData;
  user: { role?: string; name?: string | null | undefined; email?: string; username?: string | null; totalXP?: number; level?: number; currentStreak?: number };
  isEditing: boolean;
  isUploadingAvatar: boolean;
  onAvatarClick: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  profileCompletion?: number;
}) {
  const isTeacher = user.role === 'TEACHER';
  const userInitial = user.name ? user.name.charAt(0).toUpperCase() : (user.email?.charAt(0).toUpperCase() ?? 'U');

  return (
    <SettingsCard gradient delay={0}>
      <div className="p-8">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="relative group">
            <div className="h-28 w-28 rounded-full bg-gradient-to-br from-primary via-primary/70 to-accent p-1 shadow-xl shadow-primary/30">
              <div className="h-full w-full rounded-full bg-card flex items-center justify-center overflow-hidden border-2 border-card/50">
                {profile.avatar ? <img src={profile.avatar} alt="Avatar" className="h-full w-full object-cover" /> : <span className="text-4xl font-black text-foreground">{userInitial}</span>}
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
              <h2 className="text-3xl font-black text-foreground tracking-tight">
                {profile.firstName || profile.lastName ? `${profile.firstName} ${profile.lastName}`.trim() : user.username || 'المستخدم'}
              </h2>
              <span
                className={cn(
                  'inline-flex w-fit mx-auto md:mx-0 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider',
                  isTeacher ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30' : 'bg-primary/15 text-primary border border-primary/30'
                )}
              >
                {isTeacher ? '🎓 مدرس' : '📚 طالب'}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-sm text-muted-foreground">
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

            {profile.bio && <p className="text-sm text-muted-foreground max-w-lg leading-relaxed">{profile.bio}</p>}
          </div>

          <div className="space-y-3 min-w-[200px]">
            <div className="grid grid-cols-3 gap-3">
              <StatBadge icon={Star} value={user.totalXP || 0} label="نقطة XP" color="text-yellow-500" />
              <StatBadge icon={Trophy} value={user.level || 1} label="مستوى" color="text-primary" />
              <StatBadge icon={Flame} value={user.currentStreak || 0} label="تسلسل" color="text-orange-500" />
            </div>

            <div className="rounded-xl bg-muted/30 border border-border p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-muted-foreground font-medium">اكتمال الملف</span>
                <span className="text-[10px] font-bold text-primary">{profileCompletion}%</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                  style={{ width: `${profileCompletion}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </SettingsCard>
  );
}
