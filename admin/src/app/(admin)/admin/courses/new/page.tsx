import { apiClient } from "@/lib/api/api-client";
import { CourseEditor } from "@/components/admin/courses/course-editor";

export const dynamic = "force-dynamic";

export default async function NewCoursePage() {
  // Fetch data from Go Backend API
  const [categories, teachers, allCourses] = await Promise.all([
    apiClient.get<any[]>("/categories?type=COURSE").catch(() => []),
    apiClient.get<any[]>("/teachers").catch(() => []),
    apiClient.get<any[]>("/subjects").catch(() => []),
  ]);

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <CourseEditor 
        categories={categories} 
        teachers={teachers} 
        allCourses={allCourses}
      />
    </div>
  );
}
