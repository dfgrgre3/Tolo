import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

const seedTeachers = [
  { 
    id: "teacher-khan",
    name: "Khan Academy Math", 
    email: "khan@example.com",
    subjectId: "MATH", 
    onlineUrl: "https://www.khanacademy.org/math" 
  },
  { 
    id: "teacher-physics",
    name: "MinutePhysics", 
    email: "physics@example.com",
    subjectId: "PHYSICS", 
    onlineUrl: "https://www.youtube.com/@minutephysics" 
  },
  { 
    id: "teacher-chemistry",
    name: "NileRed (Chemistry)", 
    email: "chemistry@example.com",
    subjectId: "CHEMISTRY", 
    onlineUrl: "https://www.youtube.com/@NileRed" 
  },
  { 
    id: "teacher-english",
    name: "BBC Learning English", 
    email: "english@example.com",
    subjectId: "ENGLISH", 
    onlineUrl: "https://www.bbc.co.uk/learningenglish/" 
  },
];

async function seedTeachersData() {
  try {
    console.log("Seeding teachers data...");
    
    for (const teacherData of seedTeachers) {
      // 1. Ensure user exists
      const user = await prisma.user.upsert({
        where: { email: teacherData.email },
        update: {
          name: teacherData.name,
          role: UserRole.TEACHER,
        },
        create: {
          email: teacherData.email,
          name: teacherData.name,
          role: UserRole.TEACHER,
          passwordHash: "$2b$10$S95Kx8qfUXp5w.Nf6u/8..D0P7Z7G6G6G6G6G6G6G6G6G6G6G6G6", // dummy hash
        }
      });

      // 2. Ensure teacher profile exists and link to subject
      await prisma.teacher.upsert({
        where: { userId: user.id },
        update: {
          name: teacherData.name,
          onlineUrl: teacherData.onlineUrl,
          subjects: {
            connect: { id: teacherData.subjectId }
          }
        },
        create: {
          userId: user.id,
          name: teacherData.name,
          onlineUrl: teacherData.onlineUrl,
          subjects: {
            connect: { id: teacherData.subjectId }
          }
        }
      });
    }
    
    console.log("âœ“ Teachers data seeded successfully.");
  } catch (error) {
    console.error("Error seeding teachers data:", error);
  }
}

export default seedTeachersData;
