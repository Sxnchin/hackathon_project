import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
const prisma = new PrismaClient();

async function main() {
  // Create hashed password for demo users
  const defaultPassword = "password123";
  const hashed = await bcrypt.hash(defaultPassword, 10);
  await prisma.user.createMany({
    data: [
      { name: "Sanchin", email: "sanchin@example.com", password: hashed, balance: 120 },
      { name: "Chris", email: "chris@example.com", password: hashed, balance: 180 },
      { name: "Shaunak", email: "shaunak@example.com", password: hashed, balance: 50000 },
    ],
    skipDuplicates: true,
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