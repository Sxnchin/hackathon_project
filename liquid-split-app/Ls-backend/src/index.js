import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();
const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.send("💧 Ls-backend up and running!"));

// sample route
app.get("/users", async (req, res) => {
  const users = await prisma.user.findMany({ include: { pots: true } });
  res.json(users);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Ls-backend running on port ${PORT}`));
