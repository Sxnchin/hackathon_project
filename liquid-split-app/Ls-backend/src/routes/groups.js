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

    // Create group with creator as only member, send invitations to others
    const group = await prisma.$transaction(async (tx) => {
      const createdGroup = await tx.group.create({
        data: {
          name: trimmedName,
          creatorId,
        },
      });

      // Add creator as a member
      await tx.groupMember.create({
        data: {
          groupId: createdGroup.id,
          userId: creatorId,
        },
      });

      // Send invitations to all other members
      const invitationData = memberIdsNum
        .filter((memberId) => memberId !== creatorId)
        .map((memberId) => ({
          groupId: createdGroup.id,
          userId: memberId,
          status: "pending",
        }));

      let createdInvitations = [];
      if (invitationData.length > 0) {
        // Create invitations one by one to get IDs back
        for (const invData of invitationData) {
          const invitation = await tx.groupInvitation.create({
            data: invData,
          });
          createdInvitations.push(invitation);
        }

        // Get creator name for notifications
        const creator = await tx.user.findUnique({
          where: { id: creatorId },
          select: { name: true },
        });

        // Create notifications for each invitation
        const notificationData = createdInvitations.map((invitation) => ({
          userId: invitation.userId,
          groupInvitationId: invitation.id,
          type: "GROUP_INVITATION",
          message: `${creator.name} invited you to join "${trimmedName}"`,
          status: "UNREAD",
        }));

        await tx.notification.createMany({
          data: notificationData,
        });
      }

      // Return group with members and pending invitations
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
          invitations: {
            where: { status: "pending" },
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
        invitations: {
          where: { status: "pending" },
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
          orderBy: { id: "asc" }, // Order by join time (id is auto-increment)
        },
        invitations: {
          where: { status: "pending" },
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

/* ================================
   📨 GET PENDING GROUP INVITATIONS
================================ */
router.get("/invitations/pending", auth, async (req, res) => {
  try {
    const userId = Number(req.user?.userId);

    if (!Number.isInteger(userId)) {
      return res.status(403).json({ error: "Unable to identify user." });
    }

    // Clean up expired invitations (older than 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    await prisma.$transaction(async (tx) => {
      // Find expired invitations
      const expiredInvitations = await tx.groupInvitation.findMany({
        where: {
          status: "pending",
          createdAt: {
            lt: fiveMinutesAgo,
          },
        },
        select: { id: true },
      });

      if (expiredInvitations.length > 0) {
        const expiredIds = expiredInvitations.map(inv => inv.id);

        // Delete related notifications
        await tx.notification.deleteMany({
          where: {
            groupInvitationId: {
              in: expiredIds,
            },
          },
        });

        // Mark invitations as expired (or delete them)
        await tx.groupInvitation.updateMany({
          where: {
            id: {
              in: expiredIds,
            },
          },
          data: {
            status: "expired",
          },
        });
      }
    });

    // Fetch non-expired pending invitations
    const invitations = await prisma.groupInvitation.findMany({
      where: {
        userId,
        status: "pending",
        createdAt: {
          gte: fiveMinutesAgo,
        },
      },
      include: {
        group: {
          include: {
            creator: {
              select: { id: true, name: true, email: true },
            },
            members: {
              include: {
                user: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ invitations });
  } catch (error) {
    console.error("❌ Error fetching group invitations:", error);
    res.status(500).json({ error: "Failed to fetch group invitations." });
  }
});

/* ================================
   ✅ ACCEPT GROUP INVITATION
================================ */
router.post("/invitations/:invitationId/accept", auth, async (req, res) => {
  try {
    const invitationId = parseInt(req.params.invitationId);
    const userId = Number(req.user?.userId);

    if (!Number.isInteger(invitationId)) {
      return res.status(400).json({ error: "Invalid invitation ID." });
    }

    if (!Number.isInteger(userId)) {
      return res.status(403).json({ error: "Unable to identify user." });
    }

    // Get the invitation
    const invitation = await prisma.groupInvitation.findUnique({
      where: { id: invitationId },
      include: { group: true },
    });

    if (!invitation) {
      return res.status(404).json({ error: "Invitation not found." });
    }

    if (invitation.userId !== userId) {
      return res.status(403).json({ error: "This invitation is not for you." });
    }

    if (invitation.status !== "pending") {
      return res.status(400).json({ error: "Invitation has already been processed." });
    }

    // Check if invitation has expired (older than 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (invitation.createdAt < fiveMinutesAgo) {
      // Mark as expired and delete notification
      await prisma.$transaction([
        prisma.groupInvitation.update({
          where: { id: invitationId },
          data: { status: "expired" },
        }),
        prisma.notification.deleteMany({
          where: {
            groupInvitationId: invitationId,
            userId: userId,
          },
        }),
      ]);
      return res.status(400).json({ error: "This invitation has expired (5 minutes limit)." });
    }

    // Accept invitation in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update invitation status
      await tx.groupInvitation.update({
        where: { id: invitationId },
        data: { status: "accepted" },
      });

      // Add user to group
      await tx.groupMember.create({
        data: {
          groupId: invitation.groupId,
          userId,
        },
      });

      // Delete the notification associated with this invitation
      await tx.notification.deleteMany({
        where: {
          groupInvitationId: invitationId,
          userId: userId,
        },
      });

      // Return updated group
      return tx.group.findUnique({
        where: { id: invitation.groupId },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          invitations: {
            where: { status: "pending" },
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

    res.json({ group: result, message: "Group invitation accepted." });
  } catch (error) {
    console.error("❌ Error accepting group invitation:", error);
    res.status(500).json({ error: "Failed to accept group invitation." });
  }
});

/* ================================
   ❌ DECLINE GROUP INVITATION
================================ */
router.post("/invitations/:invitationId/decline", auth, async (req, res) => {
  try {
    const invitationId = parseInt(req.params.invitationId);
    const userId = Number(req.user?.userId);

    if (!Number.isInteger(invitationId)) {
      return res.status(400).json({ error: "Invalid invitation ID." });
    }

    if (!Number.isInteger(userId)) {
      return res.status(403).json({ error: "Unable to identify user." });
    }

    // Get the invitation
    const invitation = await prisma.groupInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      return res.status(404).json({ error: "Invitation not found." });
    }

    if (invitation.userId !== userId) {
      return res.status(403).json({ error: "This invitation is not for you." });
    }

    if (invitation.status !== "pending") {
      return res.status(400).json({ error: "Invitation has already been processed." });
    }

    // Check if invitation has expired (older than 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (invitation.createdAt < fiveMinutesAgo) {
      // Mark as expired and delete notification
      await prisma.$transaction([
        prisma.groupInvitation.update({
          where: { id: invitationId },
          data: { status: "expired" },
        }),
        prisma.notification.deleteMany({
          where: {
            groupInvitationId: invitationId,
            userId: userId,
          },
        }),
      ]);
      return res.status(400).json({ error: "This invitation has expired (5 minutes limit)." });
    }

    // Update invitation status and delete notification
    await prisma.$transaction([
      prisma.groupInvitation.update({
        where: { id: invitationId },
        data: { status: "declined" },
      }),
      prisma.notification.deleteMany({
        where: {
          groupInvitationId: invitationId,
          userId: userId,
        },
      }),
    ]);

    res.json({ message: "Group invitation declined." });
  } catch (error) {
    console.error("❌ Error declining group invitation:", error);
    res.status(500).json({ error: "Failed to decline group invitation." });
  }
});

/* ================================
   📧 INVITE MEMBERS TO GROUP
================================ */
router.post("/:id/invite", auth, async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    const { userIds } = req.body;
    const requesterId = Number(req.user?.userId);

    if (!Number.isInteger(groupId)) {
      return res.status(400).json({ error: "Invalid group ID." });
    }

    if (!Number.isInteger(requesterId)) {
      return res.status(403).json({ error: "Unable to identify user." });
    }

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: "At least one user ID is required." });
    }

    const userIdsNum = userIds.map(Number).filter(Number.isInteger);
    if (userIdsNum.length !== userIds.length) {
      return res.status(400).json({ error: "Invalid user IDs." });
    }

    // Get the group
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: true,
        invitations: { where: { status: "pending" } },
      },
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found." });
    }

    // Check if requester is a member of the group
    const isMember = group.members.some(m => m.userId === requesterId);
    if (!isMember) {
      return res.status(403).json({ error: "Only group members can invite others." });
    }

    // Filter out users who are already members or have pending invitations
    const existingMemberIds = group.members.map(m => m.userId);
    const pendingInvitationIds = group.invitations.map(inv => inv.userId);
    const usersToInvite = userIdsNum.filter(
      uid => !existingMemberIds.includes(uid) && !pendingInvitationIds.includes(uid)
    );

    if (usersToInvite.length === 0) {
      return res.status(400).json({ error: "All selected users are already members or have pending invitations." });
    }

    // Verify all users exist
    const users = await prisma.user.findMany({
      where: { id: { in: usersToInvite } },
      select: { id: true },
    });

    if (users.length !== usersToInvite.length) {
      return res.status(404).json({ error: "Some users not found." });
    }

    // Create invitations
    const invitationData = usersToInvite.map(userId => ({
      groupId,
      userId,
      status: "pending",
    }));

    await prisma.groupInvitation.createMany({
      data: invitationData,
    });

    res.json({ 
      message: `${usersToInvite.length} invitation${usersToInvite.length !== 1 ? 's' : ''} sent.`,
      invitationCount: usersToInvite.length,
    });
  } catch (error) {
    console.error("❌ Error inviting members to group:", error);
    res.status(500).json({ error: "Failed to invite members to group." });
  }
});

/* ================================
   🚪 LEAVE GROUP
================================ */
router.post("/:id/leave", auth, async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    const userId = Number(req.user?.userId);

    if (!Number.isInteger(groupId)) {
      return res.status(400).json({ error: "Invalid group ID." });
    }

    if (!Number.isInteger(userId)) {
      return res.status(403).json({ error: "Unable to identify user." });
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          orderBy: { id: "asc" }, // Order by creation time (id is auto-increment)
        },
      },
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found." });
    }

    // Check if user is a member
    const memberIndex = group.members.findIndex(m => m.userId === userId);
    if (memberIndex === -1) {
      return res.status(400).json({ error: "You are not a member of this group." });
    }

    const isCreator = group.creatorId === userId;
    const memberCount = group.members.length;

    await prisma.$transaction(async (tx) => {
      // Remove user from group
      await tx.groupMember.delete({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
      });

      if (isCreator) {
        if (memberCount === 1) {
          // Last member leaving, delete the group
          await tx.groupInvitation.deleteMany({ where: { groupId } });
          await tx.group.delete({ where: { id: groupId } });
        } else {
          // Transfer ownership to second-oldest member
          const newCreator = group.members.find(m => m.userId !== userId);
          if (newCreator) {
            await tx.group.update({
              where: { id: groupId },
              data: { creatorId: newCreator.userId },
            });
          }
        }
      } else if (memberCount === 1) {
        // Non-creator leaving and they're the last one, delete the group
        await tx.groupInvitation.deleteMany({ where: { groupId } });
        await tx.group.delete({ where: { id: groupId } });
      }
    });

    if (isCreator && memberCount === 1) {
      res.json({ message: "You left the group. The group has been deleted.", deleted: true });
    } else if (!isCreator && memberCount === 1) {
      res.json({ message: "You left the group. The group has been deleted.", deleted: true });
    } else if (isCreator) {
      res.json({ message: "You left the group. Ownership has been transferred.", ownershipTransferred: true });
    } else {
      res.json({ message: "You left the group successfully." });
    }
  } catch (error) {
    console.error("❌ Error leaving group:", error);
    res.status(500).json({ error: "Failed to leave group." });
  }
});

/* ================================
   🗑️ REMOVE MEMBER FROM GROUP (CREATOR ONLY)
================================ */
router.delete("/:id/members/:userId", auth, async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    const memberIdToRemove = parseInt(req.params.userId);
    const requesterId = Number(req.user?.userId);

    if (!Number.isInteger(groupId)) {
      return res.status(400).json({ error: "Invalid group ID." });
    }

    if (!Number.isInteger(memberIdToRemove)) {
      return res.status(400).json({ error: "Invalid user ID." });
    }

    if (!Number.isInteger(requesterId)) {
      return res.status(403).json({ error: "Unable to identify user." });
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { creatorId: true },
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found." });
    }

    // Only creator can remove members
    if (group.creatorId !== requesterId) {
      return res.status(403).json({ error: "Only the group creator can remove members." });
    }

    // Can't remove the creator
    if (memberIdToRemove === group.creatorId) {
      return res.status(400).json({ error: "Cannot remove the group creator. Use leave group instead." });
    }

    // Check if user is a member
    const member = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: memberIdToRemove,
        },
      },
    });

    if (!member) {
      return res.status(404).json({ error: "User is not a member of this group." });
    }

    await prisma.groupMember.delete({
      where: {
        groupId_userId: {
          groupId,
          userId: memberIdToRemove,
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
