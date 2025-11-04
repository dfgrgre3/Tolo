/**
 * Automated Test Script for Login and Registration System
 * Tests all scenarios mentioned in LOGIN_SYSTEM_TEST.md
 * 
 * Usage: npx tsx scripts/test-login-system.ts
 * Make sure the dev server is running: npm run dev
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api/auth`;

// Test results tracking
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

// Helper function to log test results
function logTest(name: string, passed: boolean, error?: string, details?: any) {
  results.push({ name, passed, error, details });
  const status = passed ? '✅ PASSED' : '❌ FAILED';
  console.log(`${status}: ${name}`);
  if (error) {
    console.log(`   Error: ${error}`);
  }
  if (details) {
    console.log(`   Details:`, JSON.stringify(details, null, 2));
  }
}

// Wait for server to be ready
async function waitForServer(maxAttempts = 30): Promise<boolean> {
  console.log('⏳ Waiting for server to be ready...');
  for (let i = 0; i < maxAttempts; i++) {
    try {
      // Try to connect to the base URL
      const response = await fetch(`${BASE_URL}`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000), // 2 second timeout
      });
      if (response.ok || response.status < 500) {
        console.log('✅ Server is ready!\n');
        return true;
      }
    } catch (error: any) {
      if (error.name === 'AbortError' || error.message?.includes('fetch')) {
        // Connection error - server not ready
        if (i < maxAttempts - 1) {
          process.stdout.write(`\r⏳ Waiting for server... (${i + 1}/${maxAttempts})`);
        }
      }
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Try login endpoint as final check
  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com', password: 'Test123!@#' }),
      signal: AbortSignal.timeout(3000),
    });
    if (response.status !== 404) {
      console.log('\n✅ Server is ready (login endpoint accessible)!\n');
      return true;
    }
  } catch (error: any) {
    if (error.name === 'AbortError' || error.message?.includes('fetch')) {
      console.log('\n❌ ERROR: Cannot connect to server!');
      console.log(`   Make sure the server is running at ${BASE_URL}`);
      console.log('   Start it with: npm run dev\n');
      return false;
    }
  }
  console.log('\n⚠️  Server may not be ready, continuing anyway...\n');
  return false;
}

// ==================== REGISTRATION TESTS ====================

async function testRegistrationValidation() {
  console.log('\n📝 Testing Registration Validation...\n');

  // Test 1: Invalid email format
  try {
    const response = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'invalid-email',
        password: 'Test123!@#',
        name: 'Test User',
      }),
      signal: AbortSignal.timeout(5000),
    });
    const data = await response.json().catch(() => ({}));
    logTest(
      'Registration - Invalid email format',
      response.status === 400 && (data.code === 'VALIDATION_ERROR' || data.code === 'INVALID_EMAIL'),
      response.status !== 400 ? `Expected 400, got ${response.status}` : undefined,
      data
    );
  } catch (error: any) {
    const errorMsg = error.name === 'AbortError' 
      ? 'Request timeout - server may not be responding'
      : error.message || 'Connection failed';
    logTest('Registration - Invalid email format', false, errorMsg);
  }

  // Test 2: Short password (< 8 characters)
  try {
    const response = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'Short1!',
        name: 'Test User',
      }),
      signal: AbortSignal.timeout(5000),
    });
    const data = await response.json().catch(() => ({}));
    logTest(
      'Registration - Short password',
      response.status === 400 && (data.code === 'VALIDATION_ERROR' || data.details?.password),
      response.status !== 400 ? `Expected 400, got ${response.status}` : undefined,
      data
    );
  } catch (error: any) {
    const errorMsg = error.name === 'AbortError' 
      ? 'Request timeout - server may not be responding'
      : error.message || 'Connection failed';
    logTest('Registration - Short password', false, errorMsg);
  }

  // Test 3: Password without uppercase
  try {
    const response = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test2@example.com',
        password: 'test123!@#',
        name: 'Test User',
      }),
      signal: AbortSignal.timeout(5000),
    });
    const data = await response.json().catch(() => ({}));
    logTest(
      'Registration - Password without uppercase',
      response.status === 400 && (data.code === 'VALIDATION_ERROR' || data.details?.password),
      response.status !== 400 ? `Expected 400, got ${response.status}` : undefined,
      data
    );
  } catch (error: any) {
    const errorMsg = error.name === 'AbortError' 
      ? 'Request timeout - server may not be responding'
      : error.message || 'Connection failed';
    logTest('Registration - Password without uppercase', false, errorMsg);
  }

  // Test 4: Password without special character
  try {
    const response = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test3@example.com',
        password: 'Test12345',
        name: 'Test User',
      }),
      signal: AbortSignal.timeout(5000),
    });
    const data = await response.json().catch(() => ({}));
    logTest(
      'Registration - Password without special character',
      response.status === 400 && (data.code === 'VALIDATION_ERROR' || data.details?.password),
      response.status !== 400 ? `Expected 400, got ${response.status}` : undefined,
      data
    );
  } catch (error: any) {
    const errorMsg = error.name === 'AbortError' 
      ? 'Request timeout - server may not be responding'
      : error.message || 'Connection failed';
    logTest('Registration - Password without special character', false, errorMsg);
  }

  // Test 5: Empty fields
  try {
    const response = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: '',
        password: '',
      }),
      signal: AbortSignal.timeout(5000),
    });
    const data = await response.json().catch(() => ({}));
    logTest(
      'Registration - Empty fields',
      response.status === 400 && (data.code === 'VALIDATION_ERROR' || data.code === 'INVALID_EMAIL'),
      response.status !== 400 ? `Expected 400, got ${response.status}` : undefined,
      data
    );
  } catch (error: any) {
    const errorMsg = error.name === 'AbortError' 
      ? 'Request timeout - server may not be responding'
      : error.message || 'Connection failed';
    logTest('Registration - Empty fields', false, errorMsg);
  }

  // Test 6: Successful registration
  const testEmail = `test-${Date.now()}@example.com`;
  try {
    const response = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'Test123!@#',
        name: 'Test User',
      }),
      signal: AbortSignal.timeout(5000),
    });
    const data = await response.json().catch(() => ({}));
    logTest(
      'Registration - Successful registration',
      response.status === 201 && data.success === true && data.user?.id,
      response.status !== 201 ? `Expected 201, got ${response.status}` : undefined,
      { userId: data.user?.id, email: data.user?.email }
    );
    return testEmail; // Return email for login tests
  } catch (error: any) {
    const errorMsg = error.name === 'AbortError' 
      ? 'Request timeout - server may not be responding'
      : error.message || 'Connection failed';
    logTest('Registration - Successful registration', false, errorMsg);
    return null;
  }
}

// ==================== LOGIN VALIDATION TESTS ====================

async function testLoginValidation() {
  console.log('\n🔐 Testing Login Validation...\n');

  // Test 1: Invalid email format
  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'invalid-email',
        password: 'Test123!@#',
        rememberMe: false,
      }),
      signal: AbortSignal.timeout(5000),
    });
    const data = await response.json().catch(() => ({}));
    logTest(
      'Login - Invalid email format',
      response.status === 400 && (data.code === 'VALIDATION_ERROR' || data.code === 'INVALID_EMAIL'),
      response.status !== 400 ? `Expected 400, got ${response.status}` : undefined,
      data
    );
  } catch (error: any) {
    const errorMsg = error.name === 'AbortError' 
      ? 'Request timeout - server may not be responding'
      : error.message || 'Connection failed';
    logTest('Login - Invalid email format', false, errorMsg);
  }

  // Test 2: Short password
  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'Short1',
        rememberMe: false,
      }),
      signal: AbortSignal.timeout(5000),
    });
    const data = await response.json().catch(() => ({}));
    logTest(
      'Login - Short password',
      response.status === 400 && (data.code === 'VALIDATION_ERROR' || data.details?.password),
      response.status !== 400 ? `Expected 400, got ${response.status}` : undefined,
      data
    );
  } catch (error: any) {
    const errorMsg = error.name === 'AbortError' 
      ? 'Request timeout - server may not be responding'
      : error.message || 'Connection failed';
    logTest('Login - Short password', false, errorMsg);
  }

  // Test 3: Empty fields
  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: '',
        password: '',
        rememberMe: false,
      }),
      signal: AbortSignal.timeout(5000),
    });
    const data = await response.json().catch(() => ({}));
    logTest(
      'Login - Empty fields',
      response.status === 400 && (data.code === 'VALIDATION_ERROR' || data.code === 'EMPTY_REQUEST_BODY'),
      response.status !== 400 ? `Expected 400, got ${response.status}` : undefined,
      data
    );
  } catch (error: any) {
    const errorMsg = error.name === 'AbortError' 
      ? 'Request timeout - server may not be responding'
      : error.message || 'Connection failed';
    logTest('Login - Empty fields', false, errorMsg);
  }

  // Test 4: Wrong credentials
  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'wrong@example.com',
        password: 'WrongPassword123!',
        rememberMe: false,
      }),
      signal: AbortSignal.timeout(5000),
    });
    const data = await response.json().catch(() => ({}));
    logTest(
      'Login - Wrong credentials',
      response.status === 401 && (data.code === 'INVALID_CREDENTIALS' || data.error),
      response.status !== 401 ? `Expected 401, got ${response.status}` : undefined,
      data
    );
  } catch (error: any) {
    const errorMsg = error.name === 'AbortError' 
      ? 'Request timeout - server may not be responding'
      : error.message || 'Connection failed';
    logTest('Login - Wrong credentials', false, errorMsg);
  }
}

// ==================== LOGIN SUCCESS TESTS ====================

async function testSuccessfulLogin(testEmail?: string | null) {
  console.log('\n✅ Testing Successful Login...\n');

  // First, create a test account if needed
  let email = testEmail;
  if (!email) {
    email = `test-login-${Date.now()}@example.com`;
    try {
      const registerResponse = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password: 'Test123!@#',
          name: 'Test User',
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (registerResponse.status !== 201) {
        logTest('Login - Create test account', false, 'Failed to create test account');
        return;
      }
    } catch (error: any) {
      const errorMsg = error.name === 'AbortError' 
        ? 'Request timeout - server may not be responding'
        : error.message || 'Connection failed';
      logTest('Login - Create test account', false, errorMsg);
      return;
    }
  }

  // Test successful login
  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'Test123!@#',
        rememberMe: false,
      }),
      signal: AbortSignal.timeout(5000),
    });
    const data = await response.json().catch(() => ({}));

    const hasToken = !!data.token;
    const hasUser = !!data.user && !!data.user.id && !!data.user.email;
    const isValidTokenFormat = hasToken && data.token.split('.').length === 3;

    logTest(
      'Login - Successful login',
      response.status === 200 && hasToken && hasUser && isValidTokenFormat,
      response.status !== 200
        ? `Expected 200, got ${response.status}`
        : !hasToken
        ? 'Missing token'
        : !hasUser
        ? 'Missing user data'
        : !isValidTokenFormat
        ? 'Invalid token format'
        : undefined,
      {
        hasToken,
        hasUser,
        isValidTokenFormat,
        userId: data.user?.id,
        email: data.user?.email,
      }
    );
  } catch (error: any) {
    const errorMsg = error.name === 'AbortError' 
      ? 'Request timeout - server may not be responding'
      : error.message || 'Connection failed';
    logTest('Login - Successful login', false, errorMsg);
  }
}

// ==================== RATE LIMITING TESTS ====================

async function testRateLimiting() {
  console.log('\n⏱️  Testing Rate Limiting...\n');

  // Make multiple failed login attempts
  const attempts = 5;
  let rateLimited = false;
  let lastResponse: any = null;

  for (let i = 0; i < attempts; i++) {
    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `ratelimit-test-${Date.now()}@example.com`,
          password: 'WrongPassword123!',
          rememberMe: false,
        }),
        signal: AbortSignal.timeout(5000),
      });
      lastResponse = await response.json().catch(() => ({}));

      if (response.status === 429) {
        rateLimited = true;
        logTest(
          'Rate Limiting - Rate limit triggered',
          true,
          undefined,
          {
            attempts: i + 1,
            retryAfterSeconds: lastResponse.retryAfterSeconds,
            code: lastResponse.code,
          }
        );
        break;
      }

      // Small delay between attempts
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error: any) {
      // Continue - connection errors are expected if server is down
      if (error.name === 'AbortError') {
        // Timeout - server may not be responding
        break;
      }
    }
  }

  if (!rateLimited) {
    logTest(
      'Rate Limiting - Rate limit triggered',
      false,
      `Rate limit not triggered after ${attempts} attempts`,
      lastResponse
    );
  }
}

// ==================== CAPTCHA TESTS ====================

async function testCaptchaRequirement() {
  console.log('\n🤖 Testing CAPTCHA Requirement...\n');

  // Make 3 failed attempts to trigger CAPTCHA
  for (let i = 0; i < 3; i++) {
    try {
      await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `captcha-test-${Date.now()}@example.com`,
          password: 'WrongPassword123!',
          rememberMe: false,
        }),
        signal: AbortSignal.timeout(5000),
      });
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error: any) {
      // Continue - connection errors are expected if server is down
      if (error.name === 'AbortError') {
        // Timeout - server may not be responding
        break;
      }
    }
  }

  // Check if CAPTCHA is required
  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `captcha-test-${Date.now()}@example.com`,
        password: 'WrongPassword123!',
        rememberMe: false,
      }),
      signal: AbortSignal.timeout(5000),
    });
    const data = await response.json().catch(() => ({}));

    logTest(
      'CAPTCHA - CAPTCHA required after 3 attempts',
      response.status === 403 && data.requiresCaptcha === true,
      response.status !== 403
        ? `Expected 403, got ${response.status}`
        : !data.requiresCaptcha
        ? 'CAPTCHA not required'
        : undefined,
      data
    );
  } catch (error: any) {
    const errorMsg = error.name === 'AbortError' 
      ? 'Request timeout - server may not be responding'
      : error.message || 'Connection failed';
    logTest('CAPTCHA - CAPTCHA required after 3 attempts', false, errorMsg);
  }
}

// ==================== MAIN TEST RUNNER ====================

async function runAllTests() {
  console.log('🚀 Starting Login System Tests\n');
  console.log('='.repeat(60));

  // Wait for server
  const serverReady = await waitForServer();
  
  if (!serverReady) {
    console.log('\n❌ Cannot proceed with tests - server is not available.');
    console.log('   Please start the server with: npm run dev\n');
    process.exit(1);
  }

  // Run all tests
  const registeredEmail = await testRegistrationValidation();
  await testLoginValidation();
  await testSuccessfulLogin(registeredEmail);
  await testRateLimiting();
  await testCaptchaRequirement();

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Summary\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

  if (failed > 0) {
    console.log('❌ Failed Tests:');
    results
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`   - ${r.name}`);
        if (r.error) {
          console.log(`     Error: ${r.error}`);
        }
      });
  }

  console.log('\n' + '='.repeat(60));

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('❌ Fatal error running tests:', error);
  process.exit(1);
});

