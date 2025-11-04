import { PrismaClient } from "@prisma/client";
import { SubjectType } from "../../src/types/settings";

const prisma = new PrismaClient();

const seedTeachers = [
  { name: "Khan Academy Math", subject: SubjectType.MATH, onlineUrl: "https://www.khanacademy.org/math" },
  { name: "MinutePhysics", subject: SubjectType.PHYSICS, onlineUrl: "https://www.youtube.com/@minutephysics" },
  { name: "NileRed (Chemistry)", subject: SubjectType.CHEMISTRY, onlineUrl: "https://www.youtube.com/@NileRed" },
  { name: "BBC Learning English", subject: SubjectType.ENGLISH, onlineUrl: "https://www.bbc.co.uk/learningenglish/" },
];

async function seedTeachersData() {
  try {
    const count = await prisma.teacher.count();
    if (count === 0) {
      console.log("Seeding teachers data...");
      await prisma.teacher.createMany({ data: seedTeachers });
      console.log("Teachers data seeded successfully.");
    } else {
      console.log("Teachers data already exists, skipping seeding.");
    }
  } catch (error) {
    console.error("Error seeding teachers data:", error);
  }
}

export default seedTeachersData;