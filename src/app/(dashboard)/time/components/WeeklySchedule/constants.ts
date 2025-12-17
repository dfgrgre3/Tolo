import { 
  BookOpen,
  Coffee,
  Target,
  Users,
  Heart,
  Dumbbell,
  ShoppingCart,
  Moon,
  Gamepad2,
  Zap
} from 'lucide-react';

export const DAYS_OF_WEEK = [
  'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'
];

export const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return `${hour}:00`;
});

export const BLOCK_TYPES = [
  { value: 'STUDY', label: 'دراسة', icon: BookOpen, color: 'bg-blue-500' },
  { value: 'BREAK', label: 'استراحة', icon: Coffee, color: 'bg-green-500' },
  { value: 'TASK', label: 'مهمة', icon: Target, color: 'bg-purple-500' },
  { value: 'MEETING', label: 'اجتماع', icon: Users, color: 'bg-orange-500' },
  { value: 'PERSONAL', label: 'شخصي', icon: Heart, color: 'bg-pink-500' },
  { value: 'EXERCISE', label: 'رياضة', icon: Dumbbell, color: 'bg-red-500' },
  { value: 'MEAL', label: 'وجبة', icon: ShoppingCart, color: 'bg-yellow-500' },
  { value: 'SLEEP', label: 'نوم', icon: Moon, color: 'bg-indigo-500' },
  { value: 'ENTERTAINMENT', label: 'ترفيه', icon: Gamepad2, color: 'bg-teal-500' },
  { value: 'WORK', label: 'عمل', icon: Zap, color: 'bg-gray-500' }
];

export const PRIORITY_COLORS = {
  'LOW': 'border-l-green-400',
  'MEDIUM': 'border-l-yellow-400', 
  'HIGH': 'border-l-orange-400',
  'URGENT': 'border-l-red-400'
};

