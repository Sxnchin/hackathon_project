import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();
const approvals = {}; // in-memory approvals store

// Create a pot
router.post("/", async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Pot name is required" });
    const newPot = await prisma.pot.create({ data: { name, totalAmount: 0 } });
    res.json(newPot);
  } catch (err) {
    next(err);
  }
});

// Join a pot
router.post("/:potId/join", async (req, res, next) => {
  try {
    const { potId } = req.params;
    const { userId, share } = req.body;
    const uid = Number(userId);
    const pid = Number(potId);
    const shr = Number(share);

    if (!Number.isFinite(uid) || !Number.isFinite(shr))
      return res.status(400).json({ error: "Valid userId and share required" });

    const potMember = await prisma.potMember.create({
      data: { userId: uid, potId: pid, share: shr },
    });
    res.json(potMember);
  } catch (err) {
    next(err);
  }
});

// Approve pot
router.post("/:potId/validate", async (req, res, next) => {
  try {
    const pid = Number(req.params.potId);
    const uid = Number(req.body.userId);
    if (!approvals[pid]) approvals[pid] = {};
    approvals[pid][uid] = true;
    res.json({ message: `User ${uid} approved pot ${pid}` });
  } catch (err) {
    next(err);
  }
});

// Trigger payment
router.post("/:potId/pay", async (req, res, next) => {
  try {
    const pid = Number(req.params.potId);
    const amt = Number(req.body.amount);
    if (!Number.isFinite(amt) || amt <= 0)
      return res.status(400).json({ error: "Valid amount required" });

    const potMembers = await prisma.potMember.findMany({
      where: { potId: pid },
      include: { user: true },
    });
    if (potMembers.length === 0)
      return res.status(400).json({ error: "No members in this pot" });

    const potApproval = approvals[pid] || {};
    const allApproved = potMembers.every((m) => potApproval[m.userId]);
    if (!allApproved)
      return res.status(400).json({ error: "Not all members have approved" });

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
  } catch (err) {
    next(err);
  }
});

export default router;