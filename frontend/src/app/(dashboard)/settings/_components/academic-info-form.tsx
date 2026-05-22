import { Briefcase, GraduationCap, Building2, BookOpen, Award, Hash } from 'lucide-react';
import { SettingsCard } from '../components';
import { ProfileInput } from './profile-input';
import { ProfileSelect } from './profile-select';
import { gradeLevels, educationTypes, sections } from './profile-data';
import type { ProfileData } from './profile-data';

export function AcademicInfoForm({
  profile,
  isEditing,
  isTeacher,
  onInputChange
}: {
  profile: ProfileData;
  isEditing: boolean;
  isTeacher: boolean;
  onInputChange: <K extends keyof ProfileData>(field: K, value: ProfileData[K]) => void;
}) {
  return (
    <SettingsCard delay={0.2}>
      <div className="p-5 border-b border-white/10">
        <h3 className="font-semibold text-white flex items-center gap-2">
          {isTeacher ? <Briefcase className="h-5 w-5 text-indigo-400" /> : <GraduationCap className="h-5 w-5 text-indigo-400" />}
          {isTeacher ? 'المعلومات المهنية' : 'المعلومات الدراسية'}
        </h3>
      </div>

      <div className="p-6 space-y-6">
        {!isTeacher ? (
          <>
            <ProfileInput id="school" label="المدرسة / المڪد" icon={Building2} value={profile.school} onChange={(e) => onInputChange('school', e.target.value)} disabled={!isEditing} placeholder="اسم مدرستك الحالية" />
            <div className="grid sm:grid-cols-2 gap-6">
              <ProfileSelect id="gradeLevel" label="الصف الدراسي" icon={GraduationCap} value={profile.gradeLevel} onChange={(e) => onInputChange('gradeLevel', e.target.value)} disabled={!isEditing} options={gradeLevels} />
              <ProfileSelect id="educationType" label="نوع التعليم" icon={BookOpen} value={profile.educationType} onChange={(e) => onInputChange('educationType', e.target.value)} disabled={!isEditing} options={educationTypes} />
            </div>
            <ProfileSelect id="section" label="الشعبة / التخصص" icon={BookOpen} value={profile.section} onChange={(e) => onInputChange('section', e.target.value)} disabled={!isEditing} options={sections} />
            <ProfileInput
              id="studyGoal"
              label="هدفك الدراسي"
              icon={Award}
              value={profile.studyGoal}
              onChange={(e) => onInputChange('studyGoal', e.target.value)}
              disabled={!isEditing}
              placeholder="مثال: دخول كلية الهندسة"
              hint="سيساعدنا هذا في توفير محتوى تعليمي مخصص لك"
            />
          </>
        ) : (
          <>
            <ProfileInput id="experienceYears" label="سنوات الخبرة" icon={Hash} value={profile.experienceYears} onChange={(e) => onInputChange('experienceYears', e.target.value)} disabled={!isEditing} placeholder="مثال: 10 سنوات" />
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300">المواد التي تدرّسها</label>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 min-h-[60px] flex flex-wrap gap-2">
                {profile.subjectsTaught.length > 0 ? (
                  profile.subjectsTaught.map((sub: string, i: number) => (
                    <span key={i} className="bg-indigo-500/20 px-3 py-1.5 rounded-lg border border-indigo-500/30 text-sm text-indigo-300 font-medium">
                      {sub}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500 italic text-sm">لم يتم تحديد مواد بعد</span>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </SettingsCard>
  );
}
