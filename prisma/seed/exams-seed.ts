import { PrismaClient } from "@prisma/client";
import { SubjectType } from "../../src/types/settings";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

// ط¨ظٹط§ظ†ط§طھ ط§ظ„ط§ظ…طھط­ط§ظ†ط§طھ ظ…ط¹ طھط­ط³ظٹظ†ط§طھ ظپظٹ ط§ظ„ط¨ظ†ظٹط© ظˆط§ظ„ط´ظ…ظˆظ„ظٹط©
const seedExams = [
  // Math Exams - ط§ظ…طھط­ط§ظ†ط§طھ ط§ظ„ط±ظٹط§ط¶ظٹط§طھ
  { 
    id: randomUUID(),
    subjectId: SubjectType.MATH, 
    title: "ط§ظ…طھط­ط§ظ† ط§ظ„ط±ظٹط§ط¶ظٹط§طھ - ط§ظ„ظپطµظ„ ط§ظ„ط¯ط±ط§ط³ظٹ ط§ظ„ط£ظˆظ„", 
    year: 2024, 
    url: "https://www.moem.gov.eg/Pages/ExamBank.aspx" 
  },
  { 
    id: randomUUID(),
    subjectId: SubjectType.MATH, 
    title: "ط§ظ…طھط­ط§ظ† ط§ظ„ط±ظٹط§ط¶ظٹط§طھ - ط§ظ„ظپطµظ„ ط§ظ„ط¯ط±ط§ط³ظٹ ط§ظ„ط«ط§ظ†ظٹ", 
    year: 2024, 
    url: "https://www.moem.gov.eg/Pages/ExamBank.aspx" 
  },
  { 
    id: randomUUID(),
    subjectId: SubjectType.MATH, 
    title: "ظ†ظ…ظˆط°ط¬ ط§ظ…طھط­ط§ظ† ط±ظٹط§ط¶ظٹط§طھ - 2023", 
    year: 2023, 
    url: "https://www.moem.gov.eg/Pages/ExamBank.aspx" 
  },
  { 
    id: randomUUID(),
    subjectId: SubjectType.MATH, 
    title: "ط§ظ…طھط­ط§ظ† ط±ظٹط§ط¶ظٹط§طھ - ط§ط®طھط¨ط§ط± ظ‚طµظٹط±", 
    year: 2024, 
    url: "https://www.moem.gov.eg/Pages/ExamBank.aspx" 
  },
  
  // Physics Exams - ط§ظ…طھط­ط§ظ†ط§طھ ط§ظ„ظپظٹط²ظٹط§ط،
  { 
    id: randomUUID(),
    subjectId: SubjectType.PHYSICS, 
    title: "ط§ظ…طھط­ط§ظ† ط§ظ„ظپظٹط²ظٹط§ط، - ط§ظ„ظپطµظ„ ط§ظ„ط¯ط±ط§ط³ظٹ ط§ظ„ط£ظˆظ„", 
    year: 2024, 
    url: "https://www.moem.gov.eg/Pages/ExamBank.aspx" 
  },
  { 
    id: randomUUID(),
    subjectId: SubjectType.PHYSICS, 
    title: "ط§ظ…طھط­ط§ظ† ط§ظ„ظپظٹط²ظٹط§ط، - ط§ظ„ظپطµظ„ ط§ظ„ط¯ط±ط§ط³ظٹ ط§ظ„ط«ط§ظ†ظٹ", 
    year: 2024, 
    url: "https://www.moem.gov.eg/Pages/ExamBank.aspx" 
  },
  { 
    id: randomUUID(),
    subjectId: SubjectType.PHYSICS, 
    title: "ظ†ظ…ظˆط°ط¬ ط§ظ…طھط­ط§ظ† ظپظٹط²ظٹط§ط، - 2023", 
    year: 2023, 
    url: "https://www.moem.gov.eg/Pages/ExamBank.aspx" 
  },
  { 
    id: randomUUID(),
    subjectId: SubjectType.PHYSICS, 
    title: "ط§ظ…طھط­ط§ظ† ظپظٹط²ظٹط§ط، - ط§ط®طھط¨ط§ط± ظ‚طµظٹط±", 
    year: 2024, 
    url: "https://www.moem.gov.eg/Pages/ExamBank.aspx" 
  },
  
  // Chemistry Exams - ط§ظ…طھط­ط§ظ†ط§طھ ط§ظ„ظƒظٹظ…ظٹط§ط،
  { 
    id: randomUUID(),
    subjectId: SubjectType.CHEMISTRY, 
    title: "ط§ظ…طھط­ط§ظ† ط§ظ„ظƒظٹظ…ظٹط§ط، - ط§ظ„ظپطµظ„ ط§ظ„ط¯ط±ط§ط³ظٹ ط§ظ„ط£ظˆظ„", 
    year: 2024, 
    url: "https://www.moem.gov.eg/Pages/ExamBank.aspx" 
  },
  { 
    id: randomUUID(),
    subjectId: SubjectType.CHEMISTRY, 
    title: "ط§ظ…طھط­ط§ظ† ط§ظ„ظƒظٹظ…ظٹط§ط، - ط§ظ„ظپطµظ„ ط§ظ„ط¯ط±ط§ط³ظٹ ط§ظ„ط«ط§ظ†ظٹ", 
    year: 2024, 
    url: "https://www.moem.gov.eg/Pages/ExamBank.aspx" 
  },
  { 
    id: randomUUID(),
    subjectId: SubjectType.CHEMISTRY, 
    title: "ظ†ظ…ظˆط°ط¬ ط§ظ…طھط­ط§ظ† ظƒظٹظ…ظٹط§ط، - 2023", 
    year: 2023, 
    url: "https://www.moem.gov.eg/Pages/ExamBank.aspx" 
  },
  { 
    id: randomUUID(),
    subjectId: SubjectType.CHEMISTRY, 
    title: "ط§ظ…طھط­ط§ظ† ظƒظٹظ…ظٹط§ط، - ط§ط®طھط¨ط§ط± ظ‚طµظٹط±", 
    year: 2024, 
    url: "https://www.moem.gov.eg/Pages/ExamBank.aspx" 
  },
  
  // Additional subjects - ظ…ظˆط§ط¯ ط¥ط¶ط§ظپظٹط©
  { 
    id: randomUUID(),
    subjectId: SubjectType.ARABIC, // Fixed from "ط§ظ„ظ„ط؛ط© ط§ظ„ط¹ط±ط¨ظٹط©"
    title: "ط§ظ…طھط­ط§ظ† ط§ظ„ظ„ط؛ط© ط§ظ„ط¹ط±ط¨ظٹط© - ط§ظ„ظپطµظ„ ط§ظ„ط¯ط±ط§ط³ظٹ ط§ظ„ط£ظˆظ„", 
    year: 2024, 
    url: "https://www.moem.gov.eg/Pages/ExamBank.aspx" 
  },
  { 
    id: randomUUID(),
    subjectId: SubjectType.ARABIC, 
    title: "ط§ظ…طھط­ط§ظ† ط§ظ„ظ„ط؛ط© ط§ظ„ط¹ط±ط¨ظٹط© - ط§ظ„ظپطµظ„ ط§ظ„ط¯ط±ط§ط³ظٹ ط§ظ„ط«ط§ظ†ظٹ", 
    year: 2024, 
    url: "https://www.moem.gov.eg/Pages/ExamBank.aspx" 
  },
  { 
    id: randomUUID(),
    subjectId: SubjectType.ENGLISH, // Fixed from "ط§ظ„ظ„ط؛ط© ط§ظ„ط¥ظ†ط¬ظ„ظٹط²ظٹط©"
    title: "ط§ظ…طھط­ط§ظ† ط§ظ„ظ„ط؛ط© ط§ظ„ط¥ظ†ط¬ظ„ظٹط²ظٹط© - ط§ظ„ظپطµظ„ ط§ظ„ط¯ط±ط§ط³ظٹ ط§ظ„ط£ظˆظ„", 
    year: 2024, 
    url: "https://www.moem.gov.eg/Pages/ExamBank.aspx" 
  },
  { 
    id: randomUUID(),
    subjectId: SubjectType.ENGLISH, 
    title: "ط§ظ…طھط­ط§ظ† ط§ظ„ظ„ط؛ط© ط§ظ„ط¥ظ†ط¬ظ„ظٹط²ظٹط© - ط§ظ„ظپطµظ„ ط§ظ„ط¯ط±ط§ط³ظٹ ط§ظ„ط«ط§ظ†ظٹ", 
    year: 2024, 
    url: "https://www.moem.gov.eg/Pages/ExamBank.aspx" 
  },
  { 
    id: randomUUID(),
    subjectId: "SCIENCE", // Fixed from "ط§ظ„ط¹ظ„ظˆظ…"
    title: "ط§ظ…طھط­ط§ظ† ط§ظ„ط¹ظ„ظˆظ… - ط§ظ„ظپطµظ„ ط§ظ„ط¯ط±ط§ط³ظٹ ط§ظ„ط£ظˆظ„", 
    year: 2024, 
    url: "https://www.moem.gov.eg/Pages/ExamBank.aspx" 
  },
  { 
    id: randomUUID(),
    subjectId: "SCIENCE", 
    title: "ط§ظ…طھط­ط§ظ† ط§ظ„ط¹ظ„ظˆظ… - ط§ظ„ظپطµظ„ ط§ظ„ط¯ط±ط§ط³ظٹ ط§ظ„ط«ط§ظ†ظٹ", 
    year: 2024, 
    url: "https://www.moem.gov.eg/Pages/ExamBank.aspx" 
  },
  { 
    id: randomUUID(),
    subjectId: "SOCIAL_STUDIES", // Fixed from "ط§ظ„ط¯ط±ط§ط³ط§طھ ط§ظ„ط§ط¬طھظ…ط§ط¹ظٹط©"
    title: "ط§ظ…طھط­ط§ظ† ط§ظ„ط¯ط±ط§ط³ط§طھ ط§ظ„ط§ط¬طھظ…ط§ط¹ظٹط© - ط§ظ„ظپطµظ„ ط§ظ„ط¯ط±ط§ط³ظٹ ط§ظ„ط£ظˆظ„", 
    year: 2024, 
    url: "https://www.moem.gov.eg/Pages/ExamBank.aspx" 
  },
  { 
    id: randomUUID(),
    subjectId: "SOCIAL_STUDIES", 
    title: "ط§ظ…طھط­ط§ظ† ط§ظ„ط¯ط±ط§ط³ط§طھ ط§ظ„ط§ط¬طھظ…ط§ط¹ظٹط© - ط§ظ„ظپطµظ„ ط§ظ„ط¯ط±ط§ط³ظٹ ط§ظ„ط«ط§ظ†ظٹ", 
    year: 2024, 
    url: "https://www.moem.gov.eg/Pages/ExamBank.aspx" 
  },
];

/**
 * ط¯ط§ظ„ط© ظ„ط²ط±ط¹ ط¨ظٹط§ظ†ط§طھ ط§ظ„ط§ظ…طھط­ط§ظ†ط§طھ ظپظٹ ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ
 * طھظ‚ظˆظ… ط¨ظپط­طµ ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ظˆط¬ظˆط¯ط© ظˆط¥ط¶ط§ظپط© ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ظپظ‚ظˆط¯ط© ظپظ‚ط·
 */
async function seedExamsData() {
  try {
    const count = await prisma.exam.count();
    
    if (count === 0) {
      console.log("ًںŒ± Seeding exams data...");
      
      // ط§ط³طھط®ط¯ط§ظ… createMany ظ…ط¹ skipDuplicates ظ„ظ…ط¹ط§ظ„ط¬ط© ط£ظپط¶ظ„ ظ„ظ„ط£ط®ط·ط§ط،
      const result = await prisma.exam.createMany({ 
        data: seedExams,
        skipDuplicates: true 
      });
      
      console.log(`âœ… Successfully seeded ${result.count} exam(s).`);
    } else {
      console.log(`ًں“ڑ Exams data already exists (${count} exam(s)), checking for missing exams...`);
      
      // ط§ظ„ط­طµظˆظ„ ط¹ظ„ظ‰ ط§ظ„ط§ظ…طھط­ط§ظ†ط§طھ ط§ظ„ظ…ظˆط¬ظˆط¯ط© ظ„ظ„طھط­ظ‚ظ‚ ظ…ظ† ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ظپظ‚ظˆط¯ط©
      const existingExams = await prisma.exam.findMany({
        select: { id: true, title: true, year: true, subjectId: true }
      });
      
      // ظپظ„طھط±ط© ط§ظ„ط§ظ…طھط­ط§ظ†ط§طھ ط§ظ„ظ…ظپظ‚ظˆط¯ط© ط¨ظ†ط§ط،ظ‹ ط¹ظ„ظ‰ ط§ظ„ط¹ظ†ظˆط§ظ† ظˆط§ظ„ط³ظ†ط© ظˆط§ظ„ظ…ط§ط¯ط©
      const missingExams = seedExams.filter(seedExam => 
        !existingExams.some(existing => 
          existing.title === seedExam.title && 
          existing.year === seedExam.year && 
          existing.subjectId === seedExam.subjectId
        )
      );
      
      if (missingExams.length > 0) {
        console.log(`â‍• Adding ${missingExams.length} missing exam(s)...`);
        const addResult = await prisma.exam.createMany({ 
          data: missingExams,
          skipDuplicates: true 
        });
        console.log(`âœ… Successfully added ${addResult.count} exam(s).`);
      } else {
        console.log("âœ¨ All exams are already in the database.");
      }
    }
  } catch (error) {
    console.error("â‌Œ Error seeding exams data:", error);
    
    // طھط³ط¬ظٹظ„ طھظپطµظٹظ„ظٹ ظ„ظ„ط£ط®ط·ط§ط،
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      if (error.stack) {
        console.error("Error stack:", error.stack);
      }
    }
    
    // ط¥ط¹ط§ط¯ط© ط±ظ…ظٹ ط§ظ„ط®ط·ط£ ظ„ظ„ط³ظ…ط§ط­ ط¨ظ…ط¹ط§ظ„ط¬طھظ‡ ظ…ظ† ظ‚ط¨ظ„ ط§ظ„ط¯ط§ظ„ط© ط§ظ„ط±ط¦ظٹط³ظٹط©
    throw error;
  } finally {
    // ط¥ط؛ظ„ط§ظ‚ ط§ظ„ط§طھطµط§ظ„ ط¨ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ
    await prisma.$disconnect();
  }
}

export default seedExamsData;
