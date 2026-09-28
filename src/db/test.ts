import prisma from './client.js';
import { Role } from '@prisma/client';

async function main() {
  console.log('Testing Database connection...');

  const testEmail = `admin_${Date.now()}@example.com`;

  try {
    // 1. Create a dummy Admin user
    const createdUser = await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash: 'argon2_hashed_dummy_password',
        role: Role.ADMIN,
      },
    });

    console.log(' Successfully created Admin user:', {
      id: createdUser.id,
      email: createdUser.email,
      role: createdUser.role,
      createdAt: createdUser.createdAt,
    });

    // 2. Query the user back from the database
    const fetchedUser = await prisma.user.findUnique({
      where: { id: createdUser.id },
    });

    if (!fetchedUser) {
      throw new Error('User was created but could not be queried back!');
    }

    console.log(' Successfully retrieved user from database:', fetchedUser);
    console.log('\n Database connection and schema verification SUCCESSFUL!');
  } catch (error) {
    console.error(' Database test failed:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
