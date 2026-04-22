const bcrypt = require('bcryptjs');

async function test() {
  try {
    console.log('Test 1: hash');
    const h = await bcrypt.hash('p', 12);
    console.log('Test 1 success:', h);

    console.log('Test 2: hash null');
    try {
      await bcrypt.hash(null, 12);
    } catch (e) {
      console.log('Test 2 caught:', e.message);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

test();
