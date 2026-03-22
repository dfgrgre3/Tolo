import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const count = await prisma.subject.count()
  console.log(`SUBJECT_COUNT: ${count}`)
}
main().catch(console.error).finally(() => prisma.$disconnect())
