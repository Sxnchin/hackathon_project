import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.user.createMany({
    data: [
      { name: "Sanchin", email: "sanchin@example.com", balance: 120 },
      { name: "Chris", email: "chris@example.com", balance: 80 },
      { name: "Shaunak", email: "shaunak@example.com", balance: 50 },
    ],
  });

  await prisma.pot.create({
    data: {
      name: "Hackathon Demo Pot",
      totalAmount: 0,
      members: {
        create: [
          { userId: 1, share: 0.5 },
          { userId: 2, share: 0.3 },
          { userId: 3, share: 0.2 },
        ],
      },
    },
  });

  console.log("Seed complete!");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());