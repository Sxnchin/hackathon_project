import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const pots = await prisma.pot.findMany({
    include: {
      members: { select: { userId: true } },
      receipts: { select: { id: true } },
      creator: { select: { email: true, name: true } },
      _count: { select: { members: true } },
    },
  });

  const targets = pots.filter(
    (pot) => pot._count.members <= 1 && pot.receipts.length === 0
  );

  if (targets.length === 0) {
    console.log("✅ No pots matched the cleanup criteria.");
    return;
  }

  console.log("🧹 Removing pots with ≤1 member and no receipts:");
  console.table(
    targets.map((pot) => ({
      id: pot.id,
      name: pot.name,
      members: pot._count.members,
      creator: pot.creator?.email ?? "n/a",
    }))
  );

  for (const pot of targets) {
    await prisma.pot.delete({ where: { id: pot.id } });
  }

  console.log(`✅ Deleted ${targets.length} pot(s).`);
}

main()
  .catch((error) => {
    console.error("❌ Cleanup failed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
