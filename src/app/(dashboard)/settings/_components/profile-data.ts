export interface ProfileData {
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

export const educationTypes = [
  { value: 'GENERAL', label: 'ثانوية عامة (عام)' },
  { value: 'STEM', label: 'ثانوية STEM' },
  { value: 'AZHAR', label: 'ثانوية أزهرية' },
  { value: 'TECHNICAL', label: 'ثانوية فنية' },
  { value: 'INTERNATIONAL', label: 'دولي / IG' }
];

export const sections = [
  { value: 'SCIENCE_BIO', label: 'علمي علوم' },
  { value: 'SCIENCE_MATH', label: 'علمي رياضة' },
  { value: 'LITERARY', label: 'أدبي' },
  { value: 'NONE', label: 'غير محدد' }
];

export const gradeLevels = [
  { value: '1_PREP', label: 'الصف الأول الإعدادي' },
  { value: '2_PREP', label: 'الصف الثاني الإعدادي' },
  { value: '3_PREP', label: 'الصف الثالث الإعدادي' },
  { value: '1_SEC', label: 'الصف الأول الثانوي' },
  { value: '2_SEC', label: 'الصف الثاني الثانوي' },
  { value: '3_SEC', label: 'الصف الثالث الثانوي' }
];

export const countries = [
  'مصر', 'السعودية', 'الإمارات', 'الكويت', 'قطر', 'البحرين', 'عُمان',
  'الأردن', 'لبنان', 'سوريا', 'العراق', 'اليمن', 'ليبيا', 'تونس',
  'الجزائر', 'المغرب', 'السودان', 'غيرها'
];

export const initialProfile: ProfileData = {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const syncProfileWithUser = (user: any): ProfileData => {
  if (!user) return initialProfile;
  const name = user.name as string | undefined;
  const dateOfBirth = (user.dateOfBirth as string | undefined) || (user.birthDate as string | undefined);
  return {
    firstName: name?.split(' ')[0] || '',
    lastName: name?.split(' ').slice(1).join(' ') || '',
    username: (user.username as string) || '',
    email: (user.email as string) || '',
    phone: (user.phone as string) || '',
    alternativePhone: (user.alternativePhone as string) || '',
    birthDate: dateOfBirth ? new Date(dateOfBirth).toISOString().split('T')[0]! : '',
    gender: (user.gender as string) || 'male',
    country: (user.country as string) || 'مصر',
    city: (user.city as string) || '',
    school: (user.school as string) || '',
    gradeLevel: (user.gradeLevel as string) || '3_SEC',
    educationType: (user.educationType as string) || 'GENERAL',
    section: (user.section as string) || 'SCIENCE_BIO',
    studyGoal: (user.studyGoal as string) || '',
    bio: (user.bio as string) || '',
    avatar: (user.avatar as string) || '',
    subjectsTaught: (user.subjectsTaught as string[]) || [],
    experienceYears: (user.experienceYears as string) || ''
  };
};
