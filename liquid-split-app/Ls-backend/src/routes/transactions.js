import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();
const approvals = {}; // in-memory approvals for proposals

// Create a transaction proposal
router.post("/propose", async (req, res, next) => {
  try {
    const { potId, amount, description } = req.body;
    if (!potId || !amount) return res.status(400).json({ error: "potId and amount required" });
    const proposal = await prisma.transaction.create({
      data: {
        potId: Number(potId),
        amount: Number(amount),
        description: description || null,
        status: "PENDING",
      },
    });
    approvals[proposal.id] = {};
    res.json(proposal);
  } catch (err) {
    next(err);
  }
});

// Approve a transaction proposal
router.post("/approve/:id", async (req, res, next) => {
  try {
    const txId = Number(req.params.id);
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });
    if (!approvals[txId]) approvals[txId] = {};
    approvals[txId][userId] = true;
    res.json({ message: `User ${userId} approved transaction ${txId}` });
  } catch (err) {
    next(err);
  }
});

// Execute a transaction (split payment)
router.post("/execute/:id", async (req, res, next) => {
  try {
    const txId = Number(req.params.id);
    const tx = await prisma.transaction.findUnique({
      where: { id: txId },
      include: { pot: { include: { members: { include: { user: true } } } } },
    });
    if (!tx) return res.status(404).json({ error: "Transaction not found" });
    if (tx.status !== "PENDING") return res.status(400).json({ error: "Transaction already executed or cancelled" });
    const potMembers = tx.pot.members;
    if (!potMembers.length) return res.status(400).json({ error: "No members in this pot" });
    const txApproval = approvals[txId] || {};
    const allApproved = potMembers.every((m) => txApproval[m.userId]);
    if (!allApproved) return res.status(400).json({ error: "Not all members have approved" });
    // Split payment
    await prisma.$transaction([
      ...potMembers.map((m) =>
        prisma.user.update({
          where: { id: m.userId },
          data: { balance: m.user.balance - tx.amount * m.share },
        })
      ),
      prisma.pot.update({
        where: { id: tx.potId },
        data: { totalAmount: { increment: tx.amount } },
      }),
      prisma.transaction.update({
        where: { id: txId },
        data: { status: "EXECUTED" },
      }),
    ]);
    delete approvals[txId];
    res.json({ message: "Transaction executed successfully" });
  } catch (err) {
    next(err);
  }
});

// Fetch transaction history
router.get("/", async (req, res, next) => {
  try {
    const txs = await prisma.transaction.findMany({
      orderBy: { createdAt: "desc" },
      include: { pot: true },
    });
    res.json(txs);
  } catch (err) {
    next(err);
  }
});

export default router;
