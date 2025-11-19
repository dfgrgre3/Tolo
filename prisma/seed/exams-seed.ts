import { PrismaClient } from "@prisma/client";
import { SubjectType } from "../../src/types/settings";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

// بيانات الامتحانات مع تحسينات في البنية والشمولية
const seedExams = [
  // Math Exams - امتحانات الرياضيات
  { 
    id: randomUUID(),
    subject: SubjectType.MATH, 
    title: "امتحان الرياضيات - الفصل الدراسي الأول", 
    year: 2024, 
    url: "https://www.moem.gov.eg/Pages/ExamBank.aspx" 
  },
  { 
    id: randomUUID(),
    subject: SubjectType.MATH, 
    title: "امتحان الرياضيات - الفصل الدراسي الثاني", 
    year: 2024, 
    url: "https://www.moem.gov.eg/Pages/ExamBank.aspx" 
  },
  { 
    id: randomUUID(),
    subject: SubjectType.MATH, 
    title: "نموذج امتحان رياضيات - 2023", 
    year: 2023, 
    url: "https://www.moem.gov.eg/Pages/ExamBank.aspx" 
  },
  { 
    id: randomUUID(),
    subject: SubjectType.MATH, 
    title: "امتحان رياضيات - اختبار قصير", 
    year: 2024, 
    url: "https://www.moem.gov.eg/Pages/ExamBank.aspx" 
  },
  
  // Physics Exams - امتحانات الفيزياء
  { 
    id: randomUUID(),
    subject: SubjectType.PHYSICS, 
    title: "امتحان الفيزياء - الفصل الدراسي الأول", 
    year: 2024, 
    url: "https://www.moem.gov.eg/Pages/ExamBank.aspx" 
  },
  { 
    id: randomUUID(),
    subject: SubjectType.PHYSICS, 
    title: "امتحان الفيزياء - الفصل الدراسي الثاني", 
    year: 2024, 
    url: "https://www.moem.gov.eg/Pages/ExamBank.aspx" 
  },
  { 
    id: randomUUID(),
    subject: SubjectType.PHYSICS, 
    title: "نموذج امتحان فيزياء - 2023", 
    year: 2023, 
    url: "https://www.moem.gov.eg/Pages/ExamBank.aspx" 
  },
  { 
    id: randomUUID(),
    subject: SubjectType.PHYSICS, 
    title: "امتحان فيزياء - اختبار قصير", 
    year: 2024, 
    url: "https://www.moem.gov.eg/Pages/ExamBank.aspx" 
  },
  
  // Chemistry Exams - امتحانات الكيمياء
  { 
    id: randomUUID(),
    subject: SubjectType.CHEMISTRY, 
    title: "امتحان الكيمياء - الفصل الدراسي الأول", 
    year: 2024, 
    url: "https://www.moem.gov.eg/Pages/ExamBank.aspx" 
  },
  { 
    id: randomUUID(),
    subject: SubjectType.CHEMISTRY, 
    title: "امتحان الكيمياء - الفصل الدراسي الثاني", 
    year: 2024, 
    url: "https://www.moem.gov.eg/Pages/ExamBank.aspx" 
  },
  { 
    id: randomUUID(),
    subject: SubjectType.CHEMISTRY, 
    title: "نموذج امتحان كيمياء - 2023", 
    year: 2023, 
    url: "https://www.moem.gov.eg/Pages/ExamBank.aspx" 
  },
  { 
    id: randomUUID(),
    subject: SubjectType.CHEMISTRY, 
    title: "امتحان كيمياء - اختبار قصير", 
    year: 2024, 
    url: "https://www.moem.gov.eg/Pages/ExamBank.aspx" 
  },
  
  // Additional subjects - مواد إضافية
  { 
    id: randomUUID(),
    subject: "اللغة العربية", 
    title: "امتحان اللغة العربية - الفصل الدراسي الأول", 
    year: 2024, 
    url: "https://www.moem.gov.eg/Pages/ExamBank.aspx" 
  },
  { 
    id: randomUUID(),
    subject: "اللغة العربية", 
    title: "امتحان اللغة العربية - الفصل الدراسي الثاني", 
    year: 2024, 
    url: "https://www.moem.gov.eg/Pages/ExamBank.aspx" 
  },
  { 
    id: randomUUID(),
    subject: "اللغة الإنجليزية", 
    title: "امتحان اللغة الإنجليزية - الفصل الدراسي الأول", 
    year: 2024, 
    url: "https://www.moem.gov.eg/Pages/ExamBank.aspx" 
  },
  { 
    id: randomUUID(),
    subject: "اللغة الإنجليزية", 
    title: "امتحان اللغة الإنجليزية - الفصل الدراسي الثاني", 
    year: 2024, 
    url: "https://www.moem.gov.eg/Pages/ExamBank.aspx" 
  },
  { 
    id: randomUUID(),
    subject: "العلوم", 
    title: "امتحان العلوم - الفصل الدراسي الأول", 
    year: 2024, 
    url: "https://www.moem.gov.eg/Pages/ExamBank.aspx" 
  },
  { 
    id: randomUUID(),
    subject: "العلوم", 
    title: "امتحان العلوم - الفصل الدراسي الثاني", 
    year: 2024, 
    url: "https://www.moem.gov.eg/Pages/ExamBank.aspx" 
  },
  { 
    id: randomUUID(),
    subject: "الدراسات الاجتماعية", 
    title: "امتحان الدراسات الاجتماعية - الفصل الدراسي الأول", 
    year: 2024, 
    url: "https://www.moem.gov.eg/Pages/ExamBank.aspx" 
  },
  { 
    id: randomUUID(),
    subject: "الدراسات الاجتماعية", 
    title: "امتحان الدراسات الاجتماعية - الفصل الدراسي الثاني", 
    year: 2024, 
    url: "https://www.moem.gov.eg/Pages/ExamBank.aspx" 
  },
];

/**
 * دالة لزرع بيانات الامتحانات في قاعدة البيانات
 * تقوم بفحص البيانات الموجودة وإضافة البيانات المفقودة فقط
 */
async function seedExamsData() {
  try {
    const count = await prisma.exam.count();
    
    if (count === 0) {
      console.log("🌱 Seeding exams data...");
      
      // استخدام createMany مع skipDuplicates لمعالجة أفضل للأخطاء
      const result = await prisma.exam.createMany({ 
        data: seedExams,
        skipDuplicates: true 
      });
      
      console.log(`✅ Successfully seeded ${result.count} exam(s).`);
    } else {
      console.log(`📚 Exams data already exists (${count} exam(s)), checking for missing exams...`);
      
      // الحصول على الامتحانات الموجودة للتحقق من البيانات المفقودة
      const existingExams = await prisma.exam.findMany({
        select: { id: true, title: true, year: true, subject: true }
      });
      
      // فلترة الامتحانات المفقودة بناءً على العنوان والسنة والمادة
      const missingExams = seedExams.filter(seedExam => 
        !existingExams.some(existing => 
          existing.title === seedExam.title && 
          existing.year === seedExam.year && 
          existing.subject === seedExam.subject
        )
      );
      
      if (missingExams.length > 0) {
        console.log(`➕ Adding ${missingExams.length} missing exam(s)...`);
        const addResult = await prisma.exam.createMany({ 
          data: missingExams,
          skipDuplicates: true 
        });
        console.log(`✅ Successfully added ${addResult.count} exam(s).`);
      } else {
        console.log("✨ All exams are already in the database.");
      }
    }
  } catch (error) {
    console.error("❌ Error seeding exams data:", error);
    
    // تسجيل تفصيلي للأخطاء
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      if (error.stack) {
        console.error("Error stack:", error.stack);
      }
    }
    
    // إعادة رمي الخطأ للسماح بمعالجته من قبل الدالة الرئيسية
    throw error;
  } finally {
    // إغلاق الاتصال بقاعدة البيانات
    await prisma.$disconnect();
  }
}

export default seedExamsData;