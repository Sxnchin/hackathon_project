import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function seed() {
  try {
    const users = [
      { name: "Alex", email: "alex@test.com", password: "password123" },
      { name: "Jordan", email: "jordan@test.com", password: "password123" },
      { name: "Sam", email: "sam@test.com", password: "password123" },
      { name: "Taylor", email: "taylor@test.com", password: "password123" },
    ];

    for (const u of users) {
      const hashedPassword = await bcrypt.hash(u.password, 10);
      await prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: {
          name: u.name,
          email: u.email,
          password: hashedPassword,
          balance: 0,
        },
      });
    }

    console.log("✅ Seeded demo users successfully.");
  } catch (err) {
    console.error("❌ Error seeding users:", err);
  } finally {
    await prisma.$disconnect();
  }
}

seed();