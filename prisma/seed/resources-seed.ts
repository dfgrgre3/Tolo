import { PrismaClient, Prisma, SubjectType } from "@prisma/client";

const prisma = new PrismaClient();

const seedResources: Prisma.ResourceCreateManyInput[] = [
  { subject: SubjectType.MATH, title: "Khan Academy - Math", url: "https://www.khanacademy.org/math", free: true, type: "platform", source: "Khan" },
  { subject: SubjectType.PHYSICS, title: "PhET Simulations", url: "https://phet.colorado.edu", free: true, type: "simulator", source: "CU" },
  { subject: SubjectType.CHEMISTRY, title: "RSC Periodic Table", url: "https://www.rsc.org/periodic-table", free: true, type: "tool", source: "RSC" },
  { subject: SubjectType.ARABIC, title: "Nafham Arabic", url: "https://www.nafham.com/ar", free: true, type: "platform", source: "Nafham" },
  { subject: SubjectType.ENGLISH, title: "BBC Learning English", url: "https://www.bbc.co.uk/learningenglish/", free: true, type: "platform", source: "BBC" },
];

async function seedResourcesData() {
  try {
    const count = await prisma.resource.count();
    if (count === 0) {
      console.log("Seeding resources data...");
      await prisma.resource.createMany({ data: seedResources });
      console.log("Resources data seeded successfully.");
    } else {
      console.log("Resources data already exists, skipping seeding.");
    }
  } catch (error) {
    console.error("Error seeding resources data:", error);
  }
}

export default seedResourcesData;