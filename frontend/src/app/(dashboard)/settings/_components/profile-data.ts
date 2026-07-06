export interface ProfileData {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  alternativePhone: string;
  birthDate: string;
  gender: 'male' | 'female';
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
] as const;

export const sections = [
  { value: 'SCIENCE_BIO', label: 'علمي علوم' },
  { value: 'SCIENCE_MATH', label: 'علمي رياضة' },
  { value: 'LITERARY', label: 'أدبي' },
  { value: 'NONE', label: 'غير محدد' }
] as const;

export const gradeLevels = [
  { value: '1_PREP', label: 'الصف الأول الإعدادي' },
  { value: '2_PREP', label: 'الصف الثاني الإعدادي' },
  { value: '3_PREP', label: 'الصف الثالث الإعدادي' },
  { value: '1_SEC', label: 'الصف الأول الثانوي' },
  { value: '2_SEC', label: 'الصف الثاني الثانوي' },
  { value: '3_SEC', label: 'الصف الثالث الثانوي' }
] as const;

export const countries = [
  'مصر', 'السعودية', 'الإمارات', 'الكويت', 'قطر', 'البحرين', 'عُمان',
  'الأردن', 'لبنان', 'سوريا', 'العراق', 'اليمن', 'ليبيا', 'تونس',
  'الجزائر', 'المغرب', 'السودان', 'غيرها'
] as const;

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

export interface UserWithExtras {
  id?: string;
  name?: string | null;
  username?: string | null;
  email?: string;
  avatar?: string | null;
  role?: string;
  permissions?: string[];
  phone?: string | null;
  school?: string | null;
  bio?: string | null;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  status?: string;
  createdAt?: string | null;
  lastLogin?: string | null;
  alternativePhone?: string | null;
  dateOfBirth?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  country?: string | null;
  city?: string | null;
  gradeLevel?: string | null;
  educationType?: string | null;
  section?: string | null;
  studyGoal?: string | null;
  subjectsTaught?: string[];
  experienceYears?: string | null;
}

export const syncProfileWithUser = (user: UserWithExtras | null | undefined): ProfileData => {
  if (!user) return initialProfile;
  
  const name = user.name as string | undefined;
  const dateOfBirth = (user.dateOfBirth as string | undefined) || (user.birthDate as string | undefined);
  const nameParts = name?.split(' ').filter(Boolean) || [];
  
  return {
    firstName: nameParts[0] || '',
    lastName: nameParts.slice(1).join(' ') || '',
    username: (user.username as string) || '',
    email: (user.email as string) || '',
    phone: (user.phone as string) ?? '',
    alternativePhone: (user.alternativePhone as string) ?? '',
    birthDate: dateOfBirth ? (new Date(dateOfBirth).toISOString().split('T')[0] as string) : '',
    gender: (user.gender as ProfileData['gender']) || 'male',
    country: (user.country as string) || 'مصر',
    city: (user.city as string) || '',
    school: (user.school as string) ?? '',
    gradeLevel: (user.gradeLevel as string) || '3_SEC',
    educationType: (user.educationType as string) || 'GENERAL',
    section: (user.section as string) || 'SCIENCE_BIO',
    studyGoal: (user.studyGoal as string) || '',
    bio: (user.bio as string) || '',
    avatar: (user.avatar as string) || '',
    subjectsTaught: Array.isArray(user.subjectsTaught) ? user.subjectsTaught : [],
    experienceYears: (user.experienceYears as string) || ''
  };
};

export const calculateProfileCompletion = (profile: ProfileData): number => {
  const fields = [
    profile.firstName,
    profile.lastName,
    profile.email,
    profile.phone,
    profile.country,
    profile.city,
    profile.bio,
    profile.avatar
  ];
  
  const filledFields = fields.filter(Boolean).length;
  return Math.round((filledFields / fields.length) * 100);
};

export const getFullName = (profile: ProfileData): string => {
  return `${profile.firstName} ${profile.lastName}`.trim() || profile.username || 'المستخدم';
};