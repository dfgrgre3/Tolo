import { AuthService } from '../src/services/auth/auth-service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testLogin() {
  const email = 'admin@thanawy.com';
  const password = 'Admin123!@#';

  console.log(`Testing login for ${email}...`);
  
  const result = await AuthService.login({
    email,
    password,
    ip: '127.0.0.1',
    userAgent: 'test-agent',
    location: 'test-location'
  });

  if (result.success) {
    console.log('Login successful!');
    console.log('User:', result.user);
  } else {
    console.log('Login failed!');
    console.log('Error:', result.error);
    console.log('Status Code:', result.statusCode);
  }
}

testLogin()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
