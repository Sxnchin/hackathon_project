import express from "express";
import { PrismaClient } from "@prisma/client";
import { auth } from "../middleware/auth.js";

const router = express.Router();
const prisma = new PrismaClient();

/* ================================
   👪 CREATE NEW GROUP
================================ */
router.post("/", auth, async (req, res) => {
  try {
    const { name, memberIds } = req.body;
    const creatorId = Number(req.user?.userId);

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Group name is required." });
    }

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ error: "At least one member is required." });
    }

    if (!Number.isInteger(creatorId)) {
      return res.status(403).json({ error: "Unable to identify user." });
    }

    const trimmedName = name.trim();
    if (trimmedName.length > 80) {
      return res.status(400).json({ error: "Group name must be 80 characters or fewer." });
    }

    // Validate all member IDs are valid users
    const memberIdsNum = memberIds.map(Number).filter(Number.isInteger);
    if (memberIdsNum.length !== memberIds.length) {
      return res.status(400).json({ error: "Invalid member IDs." });
    }

    // Verify all members exist
    const members = await prisma.user.findMany({
      where: { id: { in: memberIdsNum } },
      select: { id: true },
    });

    if (members.length !== memberIdsNum.length) {
      return res.status(404).json({ error: "Some members not found." });
    }

    // Create group with members in a transaction
    const group = await prisma.$transaction(async (tx) => {
      const createdGroup = await tx.group.create({
        data: {
          name: trimmedName,
          creatorId,
        },
      });

      // Add all members to the group
      const groupMemberData = memberIdsNum.map((memberId) => ({
        groupId: createdGroup.id,
        userId: memberId,
      }));

      await tx.groupMember.createMany({
        data: groupMemberData,
      });

      // Also add creator if not already in memberIds
      if (!memberIdsNum.includes(creatorId)) {
        await tx.groupMember.create({
          data: {
            groupId: createdGroup.id,
            userId: creatorId,
          },
        });
      }

      // Return group with members
      return tx.group.findUnique({
        where: { id: createdGroup.id },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          creator: {
            select: { id: true, name: true, email: true },
          },
        },
      });
    });

    res.status(201).json({ group });
  } catch (error) {
    console.error("❌ Error creating group:", error);
    res.status(500).json({ error: "Failed to create group." });
  }
});

/* ================================
   📋 GET ALL USER GROUPS
================================ */
router.get("/", auth, async (req, res) => {
  try {
    const userId = Number(req.user?.userId);

    if (!Number.isInteger(userId)) {
      return res.status(403).json({ error: "Unable to identify user." });
    }

    const groups = await prisma.group.findMany({
      where: {
        OR: [
          { creatorId: userId },
          { members: { some: { userId } } },
        ],
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ groups });
  } catch (error) {
    console.error("❌ Error fetching groups:", error);
    res.status(500).json({ error: "Failed to fetch groups." });
  }
});

/* ================================
   📋 GET SINGLE GROUP
================================ */
router.get("/:id", auth, async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    const userId = Number(req.user?.userId);

    if (!Number.isInteger(groupId)) {
      return res.status(400).json({ error: "Invalid group ID." });
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found." });
    }

    // Check if user is a member or creator
    const isMember = group.members.some((m) => m.userId === userId);
    const isCreator = group.creatorId === userId;

    if (!isMember && !isCreator) {
      return res.status(403).json({ error: "You are not a member of this group." });
    }

    res.json({ group });
  } catch (error) {
    console.error("❌ Error fetching group:", error);
    res.status(500).json({ error: "Failed to fetch group." });
  }
});

/* ================================
   ✏️ UPDATE GROUP
================================ */
router.patch("/:id", auth, async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    const userId = Number(req.user?.userId);
    const { name } = req.body;

    if (!Number.isInteger(groupId)) {
      return res.status(400).json({ error: "Invalid group ID." });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Group name is required." });
    }

    const trimmedName = name.trim();
    if (trimmedName.length > 80) {
      return res.status(400).json({ error: "Group name must be 80 characters or fewer." });
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { creatorId: true },
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found." });
    }

    // Only creator can update group
    if (group.creatorId !== userId) {
      return res.status(403).json({ error: "Only the group creator can update the group." });
    }

    const updatedGroup = await prisma.group.update({
      where: { id: groupId },
      data: { name: trimmedName },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json({ group: updatedGroup });
  } catch (error) {
    console.error("❌ Error updating group:", error);
    res.status(500).json({ error: "Failed to update group." });
  }
});

/* ================================
   🗑️ DELETE GROUP
================================ */
router.delete("/:id", auth, async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    const userId = Number(req.user?.userId);

    if (!Number.isInteger(groupId)) {
      return res.status(400).json({ error: "Invalid group ID." });
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { creatorId: true },
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found." });
    }

    // Only creator can delete group
    if (group.creatorId !== userId) {
      return res.status(403).json({ error: "Only the group creator can delete the group." });
    }

    await prisma.group.delete({
      where: { id: groupId },
    });

    res.json({ message: "Group deleted successfully." });
  } catch (error) {
    console.error("❌ Error deleting group:", error);
    res.status(500).json({ error: "Failed to delete group." });
  }
});

/* ================================
   ➕ ADD MEMBER TO GROUP
================================ */
router.post("/:id/members", auth, async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    const userId = Number(req.user?.userId);
    const { memberId } = req.body;

    if (!Number.isInteger(groupId)) {
      return res.status(400).json({ error: "Invalid group ID." });
    }

    if (!memberId) {
      return res.status(400).json({ error: "Member ID is required." });
    }

    const memberIdNum = Number(memberId);

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { creatorId: true },
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found." });
    }

    // Only creator can add members
    if (group.creatorId !== userId) {
      return res.status(403).json({ error: "Only the group creator can add members." });
    }

    // Check if member exists
    const member = await prisma.user.findUnique({
      where: { id: memberIdNum },
      select: { id: true },
    });

    if (!member) {
      return res.status(404).json({ error: "User not found." });
    }

    // Check if already a member
    const existingMember = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: memberIdNum } },
    });

    if (existingMember) {
      return res.status(400).json({ error: "User is already a member of this group." });
    }

    await prisma.groupMember.create({
      data: {
        groupId,
        userId: memberIdNum,
      },
    });

    // Return updated group
    const updatedGroup = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json({ group: updatedGroup });
  } catch (error) {
    console.error("❌ Error adding member to group:", error);
    res.status(500).json({ error: "Failed to add member to group." });
  }
});

/* ================================
   ➖ REMOVE MEMBER FROM GROUP
================================ */
router.delete("/:id/members/:memberId", auth, async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    const userId = Number(req.user?.userId);
    const memberId = Number(req.params.memberId);

    if (!Number.isInteger(groupId) || !Number.isInteger(memberId)) {
      return res.status(400).json({ error: "Invalid IDs." });
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { creatorId: true },
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found." });
    }

    // Only creator can remove members (or user can remove themselves)
    if (group.creatorId !== userId && memberId !== userId) {
      return res.status(403).json({ error: "Only the group creator can remove members." });
    }

    // Can't remove the creator
    if (memberId === group.creatorId) {
      return res.status(400).json({ error: "Cannot remove the group creator." });
    }

    await prisma.groupMember.delete({
      where: {
        groupId_userId: {
          groupId,
          userId: memberId,
        },
      },
    });

    res.json({ message: "Member removed successfully." });
  } catch (error) {
    console.error("❌ Error removing member from group:", error);
    res.status(500).json({ error: "Failed to remove member from group." });
  }
});

export default router;
