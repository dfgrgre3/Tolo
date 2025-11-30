// @ts-ignore
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';
let cookies: string[] = [];

function extractCookies(res: any) {
  const raw = res.headers.raw()['set-cookie'];
  if (raw) {
    const newCookies = raw.map((c: string) => c.split(';')[0]);
    cookies = [...cookies, ...newCookies];
  }
}

function getCookieString() {
  return cookies.join('; ');
}

async function runTest() {
  console.log('🚀 Starting Full Auth Flow Test...');

  // 1. Generate Random User
  const timestamp = Date.now();
  const email = `testuser_${timestamp}@example.com`;
  const password = 'Password123!';
  const name = 'Test User';

  console.log(`\n👤 User: ${email}`);

  // 2. Register
  console.log('\n📝 1. Testing Registration...');
  try {
    const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    const registerData = await registerRes.json();
    console.log(`   Status: ${registerRes.status}`);

    if (registerRes.status !== 201) {
      console.error('   ❌ Registration Failed:', registerData);
      return;
    }

    console.log('   ✅ Registration Successful');

    // Extract verification token
    const verificationLink = registerData.verificationLink;
    if (!verificationLink) {
      console.error('   ❌ Verification link not found (Are you in dev mode?)');
      return;
    }

    const token = new URL(verificationLink).searchParams.get('token');
    console.log(`   🔑 Verification Token: ${token}`);

    // 3. Verify Email
    console.log('\n📧 2. Testing Email Verification...');
    const verifyRes = await fetch(`${BASE_URL}/api/auth/verify-email?token=${token}`, {
      method: 'GET',
    });

    const verifyData = await verifyRes.json();
    console.log(`   Status: ${verifyRes.status}`);

    if (verifyRes.status !== 200 || !verifyData.success) {
      console.error('   ❌ Verification Failed:', verifyData);
      return;
    }
    console.log('   ✅ Email Verified Successfully');

    // 4. Login
    console.log('\n🔐 3. Testing Login...');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const loginData = await loginRes.json();
    console.log(`   Status: ${loginRes.status}`);

    if (loginRes.status !== 200) {
      console.error('   ❌ Login Failed:', loginData);
      return;
    }

    extractCookies(loginRes);
    console.log('   ✅ Login Successful');
    console.log('   🍪 Cookies:', getCookieString());

    // 5. Access Protected Route
    console.log('\n🛡️ 4. Testing Protected Access (/api/auth/me)...');
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Cookie': getCookieString()
      }
    });

    console.log(`   Status: ${meRes.status}`);
    if (meRes.status === 200) {
      const meData = await meRes.json();
      console.log('   ✅ Access Granted. User:', meData.user.email);
    } else {
      console.error('   ❌ Access Denied (Unexpected)');
    }

    // 6. Logout
    console.log('\n🚪 5. Testing Logout...');
    const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Cookie': getCookieString()
      }
    });

    console.log(`   Status: ${logoutRes.status}`);
    if (logoutRes.status === 200) {
      console.log('   ✅ Logout Successful');
      // Update cookies (logout should clear them)
      // For simplicity in this script, we just assume they are invalid now, 
      // but in reality we should parse Set-Cookie to clear them.
      // The server sends Set-Cookie with Max-Age=0.
    } else {
      console.error('   ❌ Logout Failed');
    }

    // 7. Access Protected Route Again
    console.log('\n🚫 6. Testing Access After Logout...');
    // We reuse the old cookies to see if they are still valid (they shouldn't be on server side)
    // Or we can simulate the browser clearing them.
    // Let's try sending the old cookies. The server should reject them if the session was deleted in DB.
    const meRes2 = await fetch(`${BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Cookie': getCookieString()
      }
    });

    console.log(`   Status: ${meRes2.status}`);
    if (meRes2.status === 401) {
      console.log('   ✅ Access Denied (Expected)');
    } else {
      console.error(`   ❌ Access Granted (Unexpected status: ${meRes2.status})`);
    }

  } catch (error) {
    console.error('❌ Test Failed with Error:', error);
  }
}

runTest();
