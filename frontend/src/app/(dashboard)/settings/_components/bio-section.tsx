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
      <div className="p-5 border-b border-border">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
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
              'w-full p-4 rounded-2xl bg-background border border-input text-foreground',
              'placeholder:text-muted-foreground resize-none font-medium leading-relaxed',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all',
              'disabled:opacity-60 disabled:cursor-not-allowed'
            )}
          />

          <div className="absolute bottom-4 left-4">
            <span className={cn('text-xs font-bold font-mono px-2 py-1 rounded-md', profile.bio.length >= 450 ? 'bg-destructive/15 text-destructive' : 'bg-muted text-muted-foreground')}>
              {profile.bio.length} / 500
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3 leading-relaxed">ستظهر هذه النبذة في ملفك الشخصي العام وفي مجتمعات النقاش الخاصة بالمناهج.</p>
      </div>
    </SettingsCard>
  );
}
