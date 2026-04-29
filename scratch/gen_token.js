const jwt = require('jsonwebtoken');
const secret = 'thanawy-super-secret-key-2024-massive-scale'; // From .env likely
const payload = {
  sub: 'cmnx633tv0004zwk08yqkmioa', // The user ID we found
  role: 'STUDENT',
  jti: 'test-session-id'
};
const token = jwt.sign(payload, secret);
console.log(token);
