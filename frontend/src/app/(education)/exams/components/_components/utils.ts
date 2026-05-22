export const assignmentTypes = [
  { value: 'EXAM', label: 'امتحان' },
  { value: 'QUIZ', label: 'اختبار قصير' },
  { value: 'HOMEWORK', label: 'واجب منزلي' },
  { value: 'PROJECT', label: 'مشروع' },
  { value: 'PARTICIPATION', label: 'مشاركة' },
  { value: 'OTHER', label: 'أخرى' },
];

export const mergeUniqueById = <T extends { id: string }>(prev: T[], incoming: T[] | undefined): T[] => {
  if (!incoming || incoming.length === 0) return prev;
  const existingIds = new Set(prev.map(item => item.id));
  const newItems = incoming.filter(item => !existingIds.has(item.id));
  return newItems.length > 0 ? [...prev, ...newItems] : prev;
};

export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const getGradeColor = (grade: number, maxGrade: number) => {
  const percentage = (grade / maxGrade) * 100;
  if (percentage >= 90) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  if (percentage >= 80) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
  if (percentage >= 70) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
  return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
};

export const getAssignmentTypeLabel = (type: string) => {
  const assignmentType = assignmentTypes.find((t) => t.value === type);
  return assignmentType ? assignmentType.label : type;
};
