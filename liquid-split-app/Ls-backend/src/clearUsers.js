import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Delete non-seed users - this removes any users not in the default seed list
    const seedEmails = ['sanchin@example.com', 'chris@example.com', 'shaunak@example.com'];
    const result = await prisma.user.deleteMany({
      where: {
        email: { notIn: seedEmails },
      },
    });
    console.log('Deleted users:', result.count);
  } catch (err) {
    console.error('Error clearing users:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
