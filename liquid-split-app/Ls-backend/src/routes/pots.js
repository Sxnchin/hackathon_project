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
    const creatorIdRaw = req.user?.userId;
    const creatorId = Number(creatorIdRaw);

    if (!name) return res.status(400).json({ error: "Missing pot name." });
    if (!Number.isInteger(creatorId)) {
      return res.status(403).json({ error: "Unable to identify creator." });
    }

    // Verify the token still maps to an existing user to avoid FK violations
    const creator = await prisma.user.findUnique({
      where: { id: creatorId },
      select: { id: true },
    });
    if (!creator) {
      return res
        .status(401)
        .json({ error: "Creator account not found. Please log in again." });
    }

    const pot = await prisma.$transaction(async (tx) => {
      // Use relation connect to attach the creator to the pot. Some Prisma
      // client/schema combinations do not expose the scalar foreign key
      // (creatorId) in the create input — using `creator: { connect: { id } }`
      // works regardless of whether the scalar field is present.
      // Create the pot first (without relation fields), then attach creator
      const createdPot = await tx.pot.create({
        data: {
          name,
          totalAmount: 0,
        },
      });

      // Ensure the creator is a member with a zero share by default
      await tx.potMember.upsert({
        where: { userId_potId: { userId: creatorId, potId: createdPot.id } },
        update: {},
        create: { userId: creatorId, potId: createdPot.id, share: 0 },
      });

      // Set the creator scalar on the pot via an update (avoids nested create/connect input shapes)
      await tx.pot.update({ where: { id: createdPot.id }, data: { creatorId } });

      return tx.pot.findUnique({
        where: { id: createdPot.id },
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
          receipts: true,
        },
      });
    });

    res.status(201).json({ pot });
  } catch (error) {
    console.error("❌ Error creating pot:", error);
    res.status(500).json({ error: "Failed to create pot." });
  }
});

/* ================================
   📂 LIST USER POTS
================================ */
router.get("/", auth, async (req, res) => {
  try {
    const userIdRaw = req.user?.userId;
    const userId = Number(userIdRaw);
    if (!Number.isInteger(userId)) {
      return res.status(403).json({ error: "Unable to identify user." });
    }

    const pots = await prisma.pot.findMany({
      where: {
        OR: [
          { creatorId: userId },
          { members: { some: { userId } } },
        ],
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        receipts: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = pots.map((pot) => {
      const membership = pot.members.find((member) => member.userId === userId);
      return {
        ...pot,
        role: pot.creatorId === userId ? "owner" : "member",
        userShare: membership?.share ?? 0,
      };
    });

    const visiblePots = formatted.filter((pot) => {
      const totalAmount = Number(pot.totalAmount || 0);
      const hasReceipts = Array.isArray(pot.receipts) && pot.receipts.length > 0;
      const hasPositiveShare = Array.isArray(pot.members)
        ? pot.members.some((member) => Number(member.share || 0) > 0)
        : false;
      return totalAmount > 0 || hasReceipts || hasPositiveShare;
    });

    res.json({ pots: visiblePots });
  } catch (error) {
    console.error("❌ Error listing pots:", error);
    res.status(500).json({ error: "Failed to list pots." });
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
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        receipts: true,
      },
    });

    if (!pot) return res.status(404).json({ error: "Pot not found." });

    res.json(pot);
  } catch (error) {
    console.error("❌ Error fetching pot:", error);
    res.status(500).json({ error: "Failed to fetch pot." });
  }
});

/* ================================
   ✏️ UPDATE POT DETAILS
================================ */
router.patch("/:id", auth, async (req, res) => {
  try {
    const potId = parseInt(req.params.id);
    const requesterIdRaw = req.user?.userId;
    const requesterId = Number(requesterIdRaw);
    const { name } = req.body ?? {};

    if (!Number.isInteger(potId)) {
      return res.status(400).json({ error: "Invalid pot id parameter." });
    }

    if (!Number.isInteger(requesterId)) {
      return res.status(403).json({ error: "Unable to identify user." });
    }

    const trimmedName =
      typeof name === "string" ? name.replace(/\s+/g, " ").trim() : "";
    if (!trimmedName) {
      return res.status(400).json({ error: "Pot name is required." });
    }
    if (trimmedName.length > 80) {
      return res
        .status(400)
        .json({ error: "Pot name must be 80 characters or fewer." });
    }

    const pot = await prisma.pot.findUnique({
      where: { id: potId },
      include: { members: true },
    });
    if (!pot) {
      return res.status(404).json({ error: "Pot not found." });
    }

    const isOwner = pot.creatorId && pot.creatorId === requesterId;
    if (!isOwner) {
      return res
        .status(403)
        .json({ error: "Only the pot owner can update the pot name." });
    }

    const updatedPot = await prisma.pot.update({
      where: { id: potId },
      data: { name: trimmedName },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        receipts: true,
      },
    });

    res.json({ pot: updatedPot });
  } catch (error) {
    console.error("❌ Error updating pot:", error);
    res.status(500).json({ error: "Failed to update pot." });
  }
});

/* ================================
   👥 ADD MEMBER TO POT
================================ */
router.post("/:id/members", auth, async (req, res) => {
  try {
    const potId = parseInt(req.params.id);
    const { userId, share } = req.body;

    if (!Number.isInteger(potId))
      return res.status(400).json({ error: "Invalid pot id parameter." });

    if (!userId || share === undefined)
      return res
        .status(400)
        .json({ error: "Missing userId or share in request body." });

    const numericUserId = parseInt(userId);
    const numericShare = Number(share);

    if (!Number.isInteger(numericUserId))
      return res.status(400).json({ error: "Invalid userId." });
    if (!Number.isFinite(numericShare) || numericShare <= 0)
      return res.status(400).json({ error: "Share must be greater than 0." });

    const user = await prisma.user.findUnique({ where: { id: numericUserId } });
    if (!user) return res.status(404).json({ error: "User not found." });

    const pot = await prisma.pot.findUnique({
      where: { id: potId },
      include: { members: true },
    });
    if (!pot) return res.status(404).json({ error: "Pot not found." });

    const existingMember = pot.members.find(
      (member) => member.userId === numericUserId
    );

    // 💳 Validate share <= user's balance
    if (numericShare > user.balance) {
      return res.status(400).json({
        error: `User ${user.name} cannot contribute more than their balance ($${user.balance}).`,
      });
    }

    const updatedPot = await prisma.$transaction(async (tx) => {
      // 💰 Deduct the contribution from the user’s balance
      await tx.user.update({
        where: { id: user.id },
        data: { balance: { decrement: numericShare } },
      });

      if (existingMember) {
        // ➕ Increase existing member share
        await tx.potMember.update({
          where: { userId_potId: { userId: user.id, potId } },
          data: { share: { increment: numericShare } },
        });
      } else {
        // 👥 Add member to pot
        await tx.potMember.create({
          data: {
            userId: user.id,
            potId,
            share: numericShare,
          },
        });
      }

      // 🪣 Update pot total
      await tx.pot.update({
        where: { id: potId },
        data: { totalAmount: { increment: numericShare } },
      });

      // 🧾 Get updated pot info (with members)
      return tx.pot.findUnique({
        where: { id: potId },
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
          receipts: true,
        },
      });
    });

    const action = existingMember ? "updated share in" : "added to";
    console.log(`✅ ${user.name} ${action} pot ${potId} with $${numericShare} contribution.`);
    res.json(updatedPot);
  } catch (error) {
    console.error("❌ Error adding member:", error);
    res.status(500).json({ error: "Failed to add member." });
  }
});

/* ================================
   ♻️ UPDATE MEMBER SHARE
================================ */
router.patch("/:id/members/:userId", auth, async (req, res) => {
  try {
    const potId = parseInt(req.params.id);
    const targetUserId = parseInt(req.params.userId);
    const delta = Number(req.body?.delta);
    const requesterIdRaw = req.user?.userId;
    const requesterId = Number(requesterIdRaw);

    if (!Number.isInteger(potId))
      return res.status(400).json({ error: "Invalid pot id parameter." });
    if (!Number.isInteger(targetUserId))
      return res.status(400).json({ error: "Invalid user id parameter." });
    if (!Number.isFinite(delta) || delta === 0)
      return res.status(400).json({ error: "Delta must be a non-zero number." });
    if (!Number.isInteger(requesterId))
      return res.status(403).json({ error: "Unable to identify user." });

    const pot = await prisma.pot.findUnique({
      where: { id: potId },
      include: {
        members: true,
      },
    });
    if (!pot) return res.status(404).json({ error: "Pot not found." });

    // Only the member themselves or the pot owner can adjust the share
    const isOwner = pot.creatorId && pot.creatorId === requesterId;
    if (requesterId !== targetUserId && !isOwner) {
      return res.status(403).json({ error: "You are not allowed to modify this share." });
    }

    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) return res.status(404).json({ error: "User not found." });

    const membership = pot.members.find((member) => member.userId === targetUserId);
    const currentShare = membership?.share ?? 0;
    const nextShare = currentShare + delta;

    if (!membership && delta < 0)
      return res.status(400).json({ error: "Cannot remove share from a non-member." });
    if (nextShare < 0)
      return res.status(400).json({ error: "Share cannot drop below zero." });

    const nextTotal = pot.totalAmount + delta;
    if (nextTotal < 0)
      return res.status(400).json({ error: "Pot total cannot drop below zero." });

    if (delta > 0 && user.balance < delta) {
      return res
        .status(400)
        .json({ error: `User ${user.name} does not have enough balance to add $${delta}.` });
    }

    const updatedPot = await prisma.$transaction(async (tx) => {
      if (!membership) {
        await tx.potMember.create({
          data: {
            userId: targetUserId,
            potId,
            share: delta,
          },
        });
      } else {
        await tx.potMember.update({
          where: { userId_potId: { userId: targetUserId, potId } },
          data: { share: nextShare },
        });
      }

      if (delta > 0) {
        await tx.user.update({
          where: { id: targetUserId },
          data: { balance: { decrement: delta } },
        });
        await tx.pot.update({
          where: { id: potId },
          data: { totalAmount: { increment: delta } },
        });
      } else {
        const absDelta = Math.abs(delta);
        await tx.user.update({
          where: { id: targetUserId },
          data: { balance: { increment: absDelta } },
        });
        await tx.pot.update({
          where: { id: potId },
          data: { totalAmount: { decrement: absDelta } },
        });
      }

      return tx.pot.findUnique({
        where: { id: potId },
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
          receipts: true,
        },
      });
    });

    res.json({ pot: updatedPot });
  } catch (error) {
    console.error("❌ Error updating member share:", error);
    res.status(500).json({ error: "Failed to update member share." });
  }
});

/* ================================
   🗑️ DELETE POT (OWNER ONLY)
================================ */
router.delete("/:id", auth, async (req, res) => {
  try {
    const potId = parseInt(req.params.id);
    const requesterIdRaw = req.user?.userId;
    const requesterId = Number(requesterIdRaw);

    if (!Number.isInteger(potId))
      return res.status(400).json({ error: "Invalid pot id parameter." });
    if (!Number.isInteger(requesterId))
      return res.status(403).json({ error: "Unable to identify user." });

    const pot = await prisma.pot.findUnique({
      where: { id: potId },
      select: { creatorId: true },
    });
    if (!pot) return res.status(404).json({ error: "Pot not found." });

    if (pot.creatorId !== requesterId) {
      return res.status(403).json({ error: "Only the pot owner can delete this pot." });
    }

    await prisma.$transaction(async (tx) => {
      await tx.receipt.deleteMany({ where: { potId } });
      await tx.potMember.deleteMany({ where: { potId } });
      await tx.pot.delete({ where: { id: potId } });
    });

    res.json({ success: true });
  } catch (error) {
    console.error("❌ Error deleting pot:", error);
    res.status(500).json({ error: "Failed to delete pot." });
  }
});

export default router;
