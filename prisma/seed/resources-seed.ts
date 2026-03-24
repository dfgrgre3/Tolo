import { PrismaClient } from "@prisma/client";
import { SubjectType } from "../../src/types/settings";

const prisma = new PrismaClient();

const seedResources = [
  { id: "res_math_khan", subjectId: SubjectType.MATH, title: "Khan Academy - Math", url: "https://www.khanacademy.org/math", free: true, type: "platform", source: "Khan" },
  { id: "res_physics_phet", subjectId: SubjectType.PHYSICS, title: "PhET Simulations", url: "https://phet.colorado.edu", free: true, type: "simulator", source: "CU" },
  { id: "res_chem_rsc", subjectId: SubjectType.CHEMISTRY, title: "RSC Periodic Table", url: "https://www.rsc.org/periodic-table", free: true, type: "tool", source: "RSC" },
  { id: "res_arabic_nafham", subjectId: SubjectType.ARABIC, title: "Nafham Arabic", url: "https://www.nafham.com/ar", free: true, type: "platform", source: "Nafham" },
  { id: "res_english_bbc", subjectId: SubjectType.ENGLISH, title: "BBC Learning English", url: "https://www.bbc.co.uk/learningenglish/", free: true, type: "platform", source: "BBC" },
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