import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { PrismaClient } from "@prisma/client";

dotenv.config();
const app = express();
const prisma = new PrismaClient();

// 🧠 Security middlewares
app.use(helmet());
app.use(cors({ origin: "*" }));
app.use(express.json());

// 🧱 Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// 🩵 Routes
app.get("/", (req, res) => res.send("💧 Ls-backend up and running!"));

// sample route
app.get("/users", async (req, res) => {
  const users = await prisma.user.findMany({ include: { pots: true } });
  res.json(users);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Ls-backend running on port ${PORT}`));
