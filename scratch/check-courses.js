const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const total = await prisma.subject.count();
  const courses = await prisma.subject.findMany({
    select: {
      id: true,
      name: true,
      nameAr: true,
      isActive: true,
      isPublished: true,
      level: true
    }
  });
  console.log('Total subjects:', total);
  console.log('---COURSES_START---');
  console.log(JSON.stringify(courses, null, 2));
  console.log('---COURSES_END---');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
