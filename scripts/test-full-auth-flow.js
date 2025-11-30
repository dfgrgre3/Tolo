const fetch = require('node-fetch');

const BASE_URL = 'http://127.0.0.1:3000';
let cookies = [];

async function checkHealth() {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/me`);
    console.log(`   Health Check Status: ${res.status}`);
    return true;
  } catch (e) {
    console.error('   ❌ Server not reachable:', e.message);
    return false;
  }
}

function extractCookies(res) {
  const raw = res.headers.raw()['set-cookie'];
  if (raw) {
    const newCookies = raw.map((c) => c.split(';')[0]);
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

    console.log(`   Status: ${registerRes.status}`);
    const registerText = await registerRes.text();
    
    let registerData;
    try {
      registerData = JSON.parse(registerText);
    } catch (e) {
      console.error('   ❌ Failed to parse JSON:', registerText);
      return;
    }
    
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
    
    console.log(`   Status: ${verifyRes.status}`);
    const verifyText = await verifyRes.text();
    let verifyData;
    try {
        verifyData = JSON.parse(verifyText);
    } catch (e) {
        console.error('   ❌ Failed to parse JSON:', verifyText);
        return;
    }
    
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
    
    console.log(`   Status: ${loginRes.status}`);
    const loginText = await loginRes.text();
    let loginData;
    try {
        loginData = JSON.parse(loginText);
    } catch (e) {
        console.error('   ❌ Failed to parse JSON:', loginText);
        return;
    }
    
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
      console.log(await meRes.text());
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
    } else {
      console.error('   ❌ Logout Failed');
      console.log(await logoutRes.text());
    }

    // 7. Access Protected Route Again
    console.log('\n🚫 6. Testing Access After Logout...');
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
      console.log(await meRes2.text());
    }

  } catch (error) {
    console.error('❌ Test Failed with Error:', error);
  }
}

runTest();
