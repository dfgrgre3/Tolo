import { rpcClient } from '@/lib/rpc-client';

export interface Course {
  id: string;
  title: string;
  description: string;
  teacherName: string;
}

export const courseRepository = {
  async getCourses(): Promise<Course[]> {
    const response = await rpcClient.getCourses({});
    return (response.courses || []).map((c: any) => ({
      id: c.id || '',
      title: c.title || '',
      description: c.description || '',
      teacherName: c.teacherName || '',
    }));
  },

  async getCourse(id: string): Promise<Course> {
    const response = await rpcClient.getCourse({ id });
    const c = response.course;
    return {
      id: c?.id || '',
      title: c?.title || '',
      description: c?.description || '',
      teacherName: c?.teacherName || '',
    };
  }
};
