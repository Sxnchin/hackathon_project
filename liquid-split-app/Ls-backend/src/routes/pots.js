import express from "express";
import { PrismaClient } from "@prisma/client";
import { auth } from "../middleware/auth.js";
const router = express.Router();
const prisma = new PrismaClient();

/* ================================
   🪣 CREATE NEW POT
================================ */
router.post("/", auth, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) return res.status(400).json({ error: "Missing pot name." });

    const pot = await prisma.pot.create({
      data: {
        name,
        totalAmount: 0,
      },
    });

    res.json(pot);
  } catch (error) {
    console.error("❌ Error creating pot:", error);
    res.status(500).json({ error: "Failed to create pot." });
  }
});

/* ================================
   📋 GET POT + MEMBERS
================================ */
router.get("/:id", auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const pot = await prisma.pot.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!pot) return res.status(404).json({ error: "Pot not found." });

    res.json(pot);
  } catch (error) {
    console.error("❌ Error fetching pot:", error);
    res.status(500).json({ error: "Failed to fetch pot." });
  }
});

/* ================================
   👥 ADD MEMBER TO POT
================================ */
router.post("/:id/members", auth, async (req, res) => {
  try {
    const potId = parseInt(req.params.id);
    const { userId, share } = req.body;

    if (!userId || share === undefined)
      return res
        .status(400)
        .json({ error: "Missing userId or share in request body." });

    const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
    if (!user) return res.status(404).json({ error: "User not found." });

    const pot = await prisma.pot.findUnique({
      where: { id: potId },
      include: { members: true },
    });
    if (!pot) return res.status(404).json({ error: "Pot not found." });

    // 💳 Validate share <= user's balance
    if (share > user.balance) {
      return res.status(400).json({
        error: `User ${user.name} cannot contribute more than their balance ($${user.balance}).`,
      });
    }

    // 💰 Deduct the contribution from the user’s balance
    const newBalance = user.balance - share;

    await prisma.user.update({
      where: { id: user.id },
      data: { balance: newBalance },
    });

    // 👥 Add member to pot
    const member = await prisma.potMember.create({
      data: {
        userId: user.id,
        potId: potId,
        share,
      },
    });

    // 🪣 Update pot total
    const newTotal = pot.totalAmount + share;
    await prisma.pot.update({
      where: { id: potId },
      data: { totalAmount: newTotal },
    });

    // 🧾 Get updated pot info (with members)
    const updatedPot = await prisma.pot.findUnique({
      where: { id: potId },
      include: { members: true },
    });

    console.log(`✅ ${user.name} added to pot ${potId} with $${share} contribution.`);
    res.json(updatedPot);
  } catch (error) {
    console.error("❌ Error adding member:", error);
    res.status(500).json({ error: "Failed to add member." });
  }
});

export default router;