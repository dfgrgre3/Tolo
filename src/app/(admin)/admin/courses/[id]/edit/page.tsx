import * as React from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CourseEditor } from "@/components/admin/courses/course-editor";

interface EditCoursePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditCoursePage({ params }: EditCoursePageProps) {
  const { id } = await params;

  const [course, categories, teachers] = await Promise.all([
    prisma.subject.findUnique({
      where: { id },
    }),
    prisma.category.findMany({
      where: { type: "COURSE" }, // Using COURSE specifically for subjects/courses
      orderBy: { name: "asc" },
    }),
    prisma.teacher.findMany({
      orderBy: { name: "asc" },
    }),
  ]);

  if (!course) {
    notFound();
  }

  // Map Subject to the format CourseEditor expects if needed
  const initialData = {
    ...course,
    // Add any mappings if field names differ slightly
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
