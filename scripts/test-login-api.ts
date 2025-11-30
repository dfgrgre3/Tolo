
// @ts-ignore
import fetch from 'node-fetch';

async function testLoginApi() {
  console.log('Testing Login API...');

  const url = 'http://localhost:3000/api/auth/login';
  const body = {
    email: 'test@example.com',
    password: 'Test123!@#',
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log(`Status: ${response.status}`);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testLoginApi();
