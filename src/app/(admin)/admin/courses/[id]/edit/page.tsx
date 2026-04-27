import * as React from "react";
import { notFound } from "next/navigation";
import { apiClient } from "@/lib/api/api-client";
import { CourseEditor } from "@/components/admin/courses/course-editor";

interface EditCoursePageProps {
  params: Promise<{
    id: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function EditCoursePage({ params }: EditCoursePageProps) {
  const { id } = await params;

  // Fetch data from Go Backend API
  const [course, categories, teachers] = await Promise.all([
    apiClient.get<any>(`/courses/${id}`).catch(() => null),
    apiClient.get<any[]>("/categories?type=COURSE").catch(() => []),
    apiClient.get<any[]>("/teachers").catch(() => []),
  ]);

  if (!course) {
    notFound();
  }

  // Map Go Subject model to the format CourseEditor expects
  const initialData = {
    ...course,
    // The Go model uses 'isActive' instead of 'active' maybe? 
    // And 'thumbnailUrl' instead of 'image'.
  };

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <CourseEditor
        courseId={id}
        initialData={initialData}
        categories={categories}
        teachers={teachers}
      />
    </div>
  );
}
