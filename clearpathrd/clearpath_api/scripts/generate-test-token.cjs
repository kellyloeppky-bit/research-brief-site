/**
 * Generate Test JWT Token
 * Quick script to generate a valid JWT token for API testing
 */

const jwt = require('jsonwebtoken');

// From .env
const SUPABASE_JWT_SECRET = 'cd1f179d-b119-44ca-a68e-861a6f9ed3b8';
const SUPABASE_URL = 'https://opfkfwwlhahqqteriicb.supabase.co';

// Test user payload
const payload = {
  sub: 'test-user-001',
  email: 'test@clearpathrd.com',
  aud: 'authenticated',
  iss: SUPABASE_URL,
  role: 'authenticated',
  exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 hours
};

const token = jwt.sign(payload, SUPABASE_JWT_SECRET);

console.log('\n=== Test JWT Token ===\n');
console.log(token);
console.log('\n=== User Info ===');
console.log('ID:', payload.sub);
console.log('Email:', payload.email);
console.log('\n=== Usage ===');
console.log('Authorization: Bearer ' + token);
console.log('\n');
