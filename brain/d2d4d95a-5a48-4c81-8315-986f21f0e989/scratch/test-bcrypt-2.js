const bcrypt = require('bcryptjs');

async function test() {
  try {
    console.log('Test 1: valid string');
    await bcrypt.compare('p', '$2a$12$RYM9CZPUKMeXAHOD01E4QeSjQIvT0.Q.rZEDkHXY/r8ok6sY4M1Ki');
    console.log('Test 1 success');

    console.log('Test 2: null hash');
    try {
      await bcrypt.compare('p', null);
    } catch (e) {
      console.log('Test 2 caught:', e.message);
    }

    console.log('Test 3: undefined hash');
    try {
      await bcrypt.compare('p', undefined);
    } catch (e) {
      console.log('Test 3 caught:', e.message);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

test();
