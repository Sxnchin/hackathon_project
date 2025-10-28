import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

/* ================================
   🧾 CREATE RECEIPT FOR POT
================================ */
router.post("/", async (req, res, next) => {
  try {
    const potId = Number(req.params.potId);
    const { payerId, amount, description } = req.body;

    if (!Number.isInteger(potId)) {
      return res.status(400).json({ error: "Invalid potId parameter." });
    }
    if (!payerId || amount === undefined) {
      return res
        .status(400)
        .json({ error: "Missing payerId or amount in request body." });
    }

    const numericPayerId = Number(payerId);
    const numericAmount = Number(amount);
    if (!Number.isInteger(numericPayerId)) {
      return res.status(400).json({ error: "Invalid payerId." });
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: "Amount must be greater than 0." });
    }

    const pot = await prisma.pot.findUnique({ where: { id: potId } });
    if (!pot) return res.status(404).json({ error: "Pot not found." });

    const payer = await prisma.user.findUnique({ where: { id: numericPayerId } });
    if (!payer) return res.status(404).json({ error: "Payer not found." });

    const membership = await prisma.potMember.findFirst({
      where: { potId, userId: numericPayerId },
    });
    if (!membership) {
      return res
        .status(400)
        .json({ error: "Payer is not a member of this pot." });
    }

    const receipt = await prisma.receipt.create({
      data: {
        potId,
        payerId: numericPayerId,
        amount: numericAmount,
        description: description ? description.toString() : null,
      },
      include: {
        payer: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.status(201).json({ receipt });
  } catch (error) {
    next(error);
  }
});

/* ================================
   📋 LIST POT RECEIPTS
================================ */
router.get("/", async (req, res, next) => {
  try {
    const potId = Number(req.params.potId);
    if (!Number.isInteger(potId)) {
      return res.status(400).json({ error: "Invalid potId parameter." });
    }

    const pot = await prisma.pot.findUnique({ where: { id: potId } });
    if (!pot) return res.status(404).json({ error: "Pot not found." });

    const receipts = await prisma.receipt.findMany({
      where: { potId },
      orderBy: { timestamp: "desc" },
      include: {
        payer: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json({ receipts });
  } catch (error) {
    next(error);
  }
});

export default router;
