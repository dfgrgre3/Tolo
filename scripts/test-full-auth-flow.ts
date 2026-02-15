// @ts-ignore
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';
let cookies: string[] = [];

// --- Type Definitions for API Responses ---
interface ApiUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  avatar: string | null;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  lastLogin: string | null;
  createdAt: string;
  provider?: string;
}

interface RegisterSuccessResponse {
  success: true;
  user: ApiUser;
  token: string;
  verificationLink?: string;
  requiresEmailVerification?: boolean;
  message?: string;
}

interface RegisterErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, string[]>;
}

type RegisterResponse = RegisterSuccessResponse | RegisterErrorResponse;

interface VerifyEmailResponse {
  success: boolean;
  message?: string;
  error?: string;
}

interface LoginSuccessResponse {
  success: true;
  message: string;
  user: ApiUser;
  token: string;
  accessToken: string;
  requiresTwoFactor?: boolean;
  loginAttemptId?: string;
}

interface LoginErrorResponse {
  error: string;
  code?: string;
}

type LoginResponse = LoginSuccessResponse | LoginErrorResponse;

interface MeResponse {
  user: ApiUser;
  sessionId?: string;
}

interface LogoutResponse {
  success: boolean;
  message?: string;
}

function extractCookies(res: { headers: { raw(): Record<string, string[]> } }) {
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

    const registerData: RegisterResponse = await registerRes.json() as RegisterResponse;
    console.log(`   Status: ${registerRes.status}`);

    if (registerRes.status !== 201) {
      console.error('   ❌ Registration Failed:', registerData);
      return;
    }

    console.log('   ✅ Registration Successful');

    // Extract verification token (only in successful responses)
    const successData = registerData as RegisterSuccessResponse;
    const verificationLink = successData.verificationLink;
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

    const verifyData: VerifyEmailResponse = await verifyRes.json() as VerifyEmailResponse;
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

    const loginData: LoginResponse = await loginRes.json() as LoginResponse;
    console.log(`   Status: ${loginRes.status}`);

    if (loginRes.status !== 200) {
      console.error('   ❌ Login Failed:', loginData);
      return;
    }

    extractCookies(loginRes as any);
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
      const meData: MeResponse = await meRes.json() as MeResponse;
      console.log('   ✅ Access Granted. User:', meData.user.email);
      console.log('   📧 Email Verified:', meData.user.emailVerified);
      console.log('   🔐 2FA Enabled:', meData.user.twoFactorEnabled);
      console.log('   🖼️ Avatar:', meData.user.avatar || 'Not set');
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
    } else {
      console.error('   ❌ Logout Failed');
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
    }

  } catch (error) {
    console.error('❌ Test Failed with Error:', error);
  }
}

runTest();
