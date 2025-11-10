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
      const createdPot = await tx.pot.create({
        data: {
          name,
          totalAmount: 0,
          creatorId,
        },
      });

      // Ensure the creator is a member with a zero share by default
      await tx.potMember.upsert({
        where: { userId_potId: { userId: creatorId, potId: createdPot.id } },
        update: {},
        create: { userId: creatorId, potId: createdPot.id, share: 0 },
      });

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
      const isFinalized = pot.status === "FINALIZED";
      // Show pot if it has activity OR is finalized
      return totalAmount > 0 || hasReceipts || hasPositiveShare || isFinalized;
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
    const { userId } = req.body;

    if (!Number.isInteger(potId))
      return res.status(400).json({ error: "Invalid pot id parameter." });

    if (!userId)
      return res
        .status(400)
        .json({ error: "Missing userId in request body." });

    const numericUserId = parseInt(userId);

    if (!Number.isInteger(numericUserId))
      return res.status(400).json({ error: "Invalid userId." });

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

    if (existingMember) {
      return res.status(400).json({ error: "User is already a member of this pot." });
    }

    const updatedPot = await prisma.$transaction(async (tx) => {


      // 👥 Add member to pot
      await tx.potMember.create({
        data: {
          userId: user.id,
          potId,
          share: 0,
        },
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

    console.log(`✅ ${user.name} added to pot ${potId}.`);
    res.json({ pot: updatedPot });
  } catch (error) {
    console.error("❌ Error adding member:", error);
    res.status(500).json({ error: "Failed to add member." });
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

/* ================================
   💰 UPDATE PAYMENT STATUS
================================ */
router.patch("/:id/members/:memberId/payment-status", auth, async (req, res) => {
  try {
    const potId = Number(req.params.id);
    const memberId = Number(req.params.memberId);
    const { status } = req.body; // PAID or DENIED
    const requesterId = Number(req.user?.userId);

    if (!Number.isInteger(potId) || !Number.isInteger(memberId)) {
      return res.status(400).json({ error: "Invalid parameters." });
    }

    if (!["PAID", "DENIED"].includes(status)) {
      return res.status(400).json({ error: "Invalid status. Must be PAID or DENIED." });
    }

    // Find the pot member
    const potMember = await prisma.potMember.findUnique({
      where: { userId_potId: { userId: memberId, potId } },
      include: {
        pot: { include: { creator: true } },
        user: { select: { id: true, name: true } },
      },
    });

    if (!potMember) {
      return res.status(404).json({ error: "Pot member not found." });
    }

    // Only the member themselves can update their payment status
    if (memberId !== requesterId) {
      return res.status(403).json({ error: "You can only update your own payment status." });
    }

    // Update payment status
    const updated = await prisma.potMember.update({
      where: { userId_potId: { userId: memberId, potId } },
      data: { paymentStatus: status },
    });

    // If denied, remove member from pot and notify creator
    if (status === "DENIED") {
      await prisma.potMember.delete({
        where: { userId_potId: { userId: memberId, potId } },
      });

      // Notify the creator
      if (potMember.pot.creatorId) {
        await prisma.notification.create({
          data: {
            userId: potMember.pot.creatorId,
            potId: potId,
            type: "PAYMENT_DENIED",
            message: `${potMember.user.name} has declined to participate in pot "${potMember.pot.name}".`,
            status: "UNREAD",
          },
        });
      }

      return res.json({ message: "You have been removed from the pot.", removed: true });
    }

    res.json({ potMember: updated });
  } catch (error) {
    console.error("❌ Error updating payment status:", error);
    res.status(500).json({ error: "Failed to update payment status." });
  }
});

/* ================================
   🏁 FINALIZE POT (Start Split)
================================ */
router.post("/:id/finalize", auth, async (req, res) => {
  try {
    const potId = Number(req.params.id);
    const requesterId = Number(req.user?.userId);

    if (!Number.isInteger(potId)) {
      return res.status(400).json({ error: "Invalid pot ID." });
    }

    const pot = await prisma.pot.findUnique({
      where: { id: potId },
      include: {
        members: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    if (!pot) {
      return res.status(404).json({ error: "Pot not found." });
    }

    // Only creator can finalize
    if (pot.creatorId !== requesterId) {
      return res.status(403).json({ error: "Only the pot creator can finalize the pot." });
    }

    // Check if all members have paid
    const unpaidMembers = pot.members.filter(m => m.paymentStatus !== "PAID");

    if (unpaidMembers.length > 0) {
      const unpaidNames = unpaidMembers.map(m => m.user.name).join(", ");
      return res.status(400).json({
        error: "Not all members have paid yet.",
        unpaidMembers: unpaidNames,
      });
    }

    // All members have paid - mark pot as finalized and delete all related notifications
    const finalizedPot = await prisma.$transaction(async (tx) => {
      // Delete all notifications related to this pot
      await tx.notification.deleteMany({
        where: { potId: potId },
      });

      // Update pot status to FINALIZED
      return tx.pot.update({
        where: { id: potId },
        data: { status: "FINALIZED" },
        include: {
          members: {
            include: { user: { select: { id: true, name: true } } },
          },
        },
      });
    });

    res.json({
      success: true,
      message: "Pot finalized successfully. All members have confirmed payment.",
      pot: finalizedPot,
    });
  } catch (error) {
    console.error("❌ Error finalizing pot:", error);
    res.status(500).json({ error: "Failed to finalize pot." });
  }
});

export default router;
