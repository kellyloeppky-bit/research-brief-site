/**
 * Generate a test JWT token for manual API testing
 * Usage: tsx scripts/generate-test-token.ts
 */

import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function generateTestToken() {
  try {
    // Get the first regular user from the database
    const user = await prisma.user.findFirst({
      where: {
        role: 'user',
      },
    });

    if (!user) {
      console.error('❌ No regular user found in database');
      console.log('Create a user first, then run this script again.');
      process.exit(1);
    }

    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    const supabaseUrl = process.env.SUPABASE_URL;

    if (!jwtSecret) {
      console.error('❌ SUPABASE_JWT_SECRET not configured in .env');
      process.exit(1);
    }

    if (!supabaseUrl) {
      console.error('❌ SUPABASE_URL not configured in .env');
      process.exit(1);
    }

    // Generate JWT token with Supabase-compatible claims
    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        aud: 'authenticated', // Required by Supabase JWT verification
        iss: supabaseUrl, // Required by Supabase JWT verification
      },
      jwtSecret,
      {
        algorithm: 'HS256',
        expiresIn: '7d',
      }
    );

    console.log('\n✅ Test Token Generated Successfully!\n');
    console.log('User Details:');
    console.log(`  - ID: ${user.id}`);
    console.log(`  - Email: ${user.email}`);
    console.log(`  - Role: ${user.role}`);
    console.log(`  - Name: ${user.firstName} ${user.lastName}`);
    console.log('\n📋 JWT Token (copy this):');
    console.log(`\n${token}\n`);
    console.log('\n💡 Usage Examples:\n');
    console.log('curl http://localhost:3001/api/v1/kit-orders \\');
    console.log(`  -H "Authorization: Bearer ${token}"\n`);
    console.log('curl http://localhost:3001/api/v1/test-sessions \\');
    console.log(`  -H "Authorization: Bearer ${token}"\n`);

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error generating token:', error);
    process.exit(1);
  }
}

generateTestToken();
