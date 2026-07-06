import 'server-only';
/**
 * Course Repository — re-exports from subject-repository with legacy aliases.
 * Maintains backward compatibility with existing code that imports from course-repository.
 * New code should import directly from subject-repository.
 */
export type { Subject as Course } from '@/types/subject';
export { subjectRepository as courseRepository } from './subject-repository';
