import { BookOpen } from 'lucide-react';
import { SettingsCard } from '../components';
import { cn } from '@/lib/utils';
import type { ProfileData } from './profile-data';

export function BioSection({
  profile,
  isEditing,
  onInputChange
}: {
  profile: ProfileData;
  isEditing: boolean;
  onInputChange: <K extends keyof ProfileData>(field: K, value: ProfileData[K]) => void;
}) {
  return (
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
            onChange={(e) => onInputChange('bio', e.target.value.slice(0, 500))}
            disabled={!isEditing}
            placeholder="اكتب نبذة عن نفسك، اهتماماتك أو أهدافك..."
            rows={4}
            className={cn(
              'w-full p-4 rounded-2xl bg-slate-800/50 border border-white/10 text-white',
              'placeholder:text-slate-600 resize-none font-medium leading-relaxed',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all',
              'disabled:opacity-60 disabled:cursor-not-allowed'
            )}
          />

          <div className="absolute bottom-4 left-4">
            <span className={cn('text-xs font-bold font-mono px-2 py-1 rounded-md', profile.bio.length >= 450 ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-slate-500')}>
              {profile.bio.length} / 500
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-3 leading-relaxed">ستظهر هذه النبذة في ملفك الشخصي العام وفي مجتمعات النقاش الخاصة بالمناهج.</p>
      </div>
    </SettingsCard>
  );
}
