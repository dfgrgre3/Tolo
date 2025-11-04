import { PrismaClient } from "@prisma/client";
import { SubjectType, ExamType } from "../../src/types/settings";

const prisma = new PrismaClient();

const seedExams = [
  { subject: SubjectType.MATH, title: "Math Past Papers", year: 2023, url: "https://www.moem.gov.eg/Pages/ExamBank.aspx" },
  { subject: SubjectType.PHYSICS, title: "Physics Past Papers", year: 2023, url: "https://www.moem.gov.eg/Pages/ExamBank.aspx" },
  { subject: SubjectType.CHEMISTRY, title: "Chemistry Past Papers", year: 2023, url: "https://www.moem.gov.eg/Pages/ExamBank.aspx" },
];

async function seedExamsData() {
  try {
    const count = await prisma.exam.count();
    if (count === 0) {
      console.log("Seeding exams data...");
      await prisma.exam.createMany({ data: seedExams });
      console.log("Exams data seeded successfully.");
    } else {
      console.log("Exams data already exists, skipping seeding.");
    }
  } catch (error) {
    console.error("Error seeding exams data:", error);
  }
}

export default seedExamsData;