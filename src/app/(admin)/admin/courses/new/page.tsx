import { prisma } from "@/lib/db";
import { CourseEditor } from "@/components/admin/courses/course-editor";

export default async function NewCoursePage() {
  const [categories, teachers, allCourses] = await Promise.all([
    prisma.category.findMany({
      where: { type: "COURSE" },
      orderBy: { name: "asc" },
    }),
    prisma.teacher.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.subject.findMany({
      select: { id: true, name: true, nameAr: true },
      orderBy: { name: "asc" },
    }),
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
