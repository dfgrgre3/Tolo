const bcrypt = require('bcryptjs');

async function test() {
  try {
    const result = await bcrypt.compare('password', 'invalid_hash');
    console.log('Result:', result);
  } catch (error) {
    console.error('Error caught:', error);
  }
}

test();
