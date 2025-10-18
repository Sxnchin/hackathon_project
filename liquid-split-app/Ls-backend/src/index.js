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

// 🧱 Rate limiting (100 requests per 15 min per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// 🩵 Health route
app.get("/health", (req, res) => res.send("💧 Ls-backend up and running!"));

// 🧮 In-memory store for approvals
const approvals = {};

// =====================
// 📦 POT ROUTES
// =====================

// Create a pot
app.post("/pots", async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Pot name is required" });

  const newPot = await prisma.pot.create({
    data: { name, totalAmount: 0 },
  });
  res.json(newPot);
});

// Join a pot
app.post("/pots/:potId/join", async (req, res) => {
  const { potId } = req.params;
  const { userId, share } = req.body;
  const uid = Number(userId);
  const pid = Number(potId);
  const shr = Number(share);

  if (!Number.isFinite(uid) || !Number.isFinite(shr)) {
    return res.status(400).json({ error: "Valid userId and share are required" });
  }

  const potMember = await prisma.potMember.create({
    data: { userId: uid, potId: pid, share: shr },
  });
  res.json(potMember);
});

// Approve pot
app.post("/pots/:potId/validate", async (req, res) => {
  const pid = Number(req.params.potId);
  const uid = Number(req.body.userId);
  if (!approvals[pid]) approvals[pid] = {};
  approvals[pid][uid] = true;
  res.json({ message: `User ${uid} approved pot ${pid}` });
});

// Trigger payment
app.post("/pots/:potId/pay", async (req, res) => {
  const pid = Number(req.params.potId);
  const amt = Number(req.body.amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    return res.status(400).json({ error: "Valid amount is required" });
  }

  const potMembers = await prisma.potMember.findMany({
    where: { potId: pid },
    include: { user: true },
  });

  if (potMembers.length === 0) {
    return res.status(400).json({ error: "No members in this pot" });
  }

  const potApproval = approvals[pid] || {};
  const allApproved = potMembers.every((m) => potApproval[m.userId]);

  if (!allApproved) {
    return res.status(400).json({ error: "Not all members have approved the payment" });
  }

  await prisma.$transaction([
    ...potMembers.map((m) =>
      prisma.user.update({
        where: { id: m.userId },
        data: { balance: m.user.balance - amt * m.share },
      })
    ),
    prisma.pot.update({
      where: { id: pid },
      data: { totalAmount: { increment: amt } },
    }),
  ]);

  delete approvals[pid];
  res.json({ message: "Payment processed successfully" });
});

// =====================
// 👤 USER ROUTES
// =====================

// Get user balance
app.get("/users/:userId/balance", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: Number(req.params.userId) },
  });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ balance: user.balance });
});

// Get all users
app.get("/users", async (req, res) => {
  const users = await prisma.user.findMany({ include: { pots: true } });
  res.json(users);
});

// =====================
// 🚀 SERVER START
// =====================
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Ls-backend running on port ${PORT}`));