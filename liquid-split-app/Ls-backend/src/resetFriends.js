import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function resetFriendships() {
  try {
    console.log('🔄 Resetting all friendships...');
    
    const result = await prisma.friend.deleteMany({});
    
    console.log(`✅ Successfully deleted ${result.count} friendship records`);
    console.log('Database is now clean - ready to test friend requests!');
    
  } catch (error) {
    console.error('❌ Error resetting friendships:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetFriendships();
