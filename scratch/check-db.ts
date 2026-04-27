import { DatabaseHealthMonitor } from '../src/lib/db-health';
import { prisma } from '../src/lib/db';

async function checkDatabase() {
  console.log('🔍 Running Database Health Check...');
  try {
    const health = await DatabaseHealthMonitor.check();
    console.log('\n📊 Health Status:');
    console.log(JSON.stringify(health, null, 2));
    
    if (health.healthy) {
      console.log('\n✅ Database is healthy and responding.');
    } else {
      console.log('\n❌ Database health is degraded.');
    }
    
    // Check for some common tables
    console.log('\n📁 Checking table counts...');
    const userCount = await prisma.user.count();
    console.log(`- Users: ${userCount}`);
    
    const subjectCount = await prisma.subject.count();
    console.log(`- Subjects: ${subjectCount}`);
    
  } catch (error) {
    console.error('\n❌ Error during database check:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
