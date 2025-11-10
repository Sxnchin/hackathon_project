import express from "express";
import { PrismaClient } from "@prisma/client";
import { auth } from "../middleware/auth.js";

const router = express.Router();
const prisma = new PrismaClient();

// =====================
// GET /notifications
// Get all notifications for the logged-in user
// =====================
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Clean up expired group invitation notifications (older than 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    // Find expired group invitations and mark them
    const expiredInvitations = await prisma.groupInvitation.findMany({
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
      
      await prisma.$transaction([
        // Delete notifications for expired invitations
        prisma.notification.deleteMany({
          where: {
            groupInvitationId: {
              in: expiredIds,
            },
          },
        }),
        // Mark invitations as expired
        prisma.groupInvitation.updateMany({
          where: {
            id: {
              in: expiredIds,
            },
          },
          data: {
            status: "expired",
          },
        }),
      ]);
    }

    const notifications = await prisma.notification.findMany({
      where: { userId },
      include: {
        pot: {
          include: {
            creator: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // For each notification, fetch additional data based on type
    const enrichedNotifications = await Promise.all(
      notifications.map(async (notification) => {
        const enriched = { ...notification };

        // Fetch friend request details if applicable
        if (notification.friendRequestId) {
          const friendRequest = await prisma.friend.findUnique({
            where: { id: notification.friendRequestId },
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          });
          enriched.friendRequest = friendRequest;
        }

        // Fetch group invitation details if applicable
        if (notification.groupInvitationId) {
          const groupInvitation = await prisma.groupInvitation.findUnique({
            where: { id: notification.groupInvitationId },
            include: {
              group: {
                include: {
                  creator: {
                    select: { id: true, name: true, email: true },
                  },
                },
              },
            },
          });
          
          // Skip if invitation expired
          if (groupInvitation && groupInvitation.status === "expired") {
            return null;
          }
          
          enriched.groupInvitation = groupInvitation;
        }

        return enriched;
      })
    );

    // Filter out null notifications (expired ones)
    const validNotifications = enrichedNotifications.filter(n => n !== null);

    res.json({ notifications: validNotifications });
  } catch (err) {
    console.error("Failed to fetch notifications:", err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// =====================
// POST /notifications
// Create a new notification
// =====================
router.post("/", auth, async (req, res) => {
  try {
    const { userId, potId, type, message } = req.body;

    if (!userId || !type || !message) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        potId: potId || null,
        type,
        message,
        status: "UNREAD",
      },
    });

    res.json({ notification });
  } catch (err) {
    console.error("Failed to create notification:", err);
    res.status(500).json({ error: "Failed to create notification" });
  }
});

// =====================
// PATCH /notifications/:id
// Mark a notification as read
// =====================
router.patch("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const notification = await prisma.notification.findUnique({
      where: { id: parseInt(id) },
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    if (notification.userId !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const updated = await prisma.notification.update({
      where: { id: parseInt(id) },
      data: { status: "READ" },
    });

    res.json({ notification: updated });
  } catch (err) {
    console.error("Failed to update notification:", err);
    res.status(500).json({ error: "Failed to update notification" });
  }
});

// =====================
// DELETE /notifications/:id
// Delete a notification
// =====================
router.delete("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const notification = await prisma.notification.findUnique({
      where: { id: parseInt(id) },
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    if (notification.userId !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await prisma.notification.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: "Notification deleted successfully" });
  } catch (err) {
    console.error("Failed to delete notification:", err);
    res.status(500).json({ error: "Failed to delete notification" });
  }
});

export default router;
