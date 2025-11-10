import express from "express";
import { PrismaClient } from "@prisma/client";
import { auth } from "../middleware/auth.js";

const router = express.Router();
const prisma = new PrismaClient();

/* ================================
   👥 ADD FRIEND
================================ */
router.post("/add", auth, async (req, res) => {
  try {
    const { friendId } = req.body;
    const userId = Number(req.user?.userId);

    if (!friendId) {
      return res.status(400).json({ error: "Friend ID is required." });
    }

    const friendIdNum = Number(friendId);

    if (!Number.isInteger(userId) || !Number.isInteger(friendIdNum)) {
      return res.status(400).json({ error: "Invalid user IDs." });
    }

    // Can't add yourself as a friend
    if (userId === friendIdNum) {
      return res.status(400).json({ error: "You cannot add yourself as a friend." });
    }

    // Check if friend exists
    const friendUser = await prisma.user.findUnique({
      where: { id: friendIdNum },
      select: { id: true, name: true, email: true },
    });

    if (!friendUser) {
      return res.status(404).json({ error: "User not found." });
    }

    // Check if friendship already exists (either direction)
    const existingFriendship = await prisma.friend.findFirst({
      where: {
        OR: [
          { userId, friendId: friendIdNum },
          { userId: friendIdNum, friendId: userId },
        ],
      },
    });

    if (existingFriendship) {
      if (existingFriendship.status === "pending") {
        return res.status(400).json({ error: "Friend request already sent." });
      }
      return res.status(400).json({ error: "Already friends." });
    }

    // Create friend request (only one direction - from requester to recipient)
    await prisma.friend.create({
      data: { userId, friendId: friendIdNum, status: "pending" },
    });

    res.status(201).json({ 
      message: "Friend request sent successfully.", 
      friend: friendUser 
    });
  } catch (error) {
    console.error("❌ Error adding friend:", error);
    res.status(500).json({ error: "Failed to add friend." });
  }
});

/* ================================
   📋 GET ALL FRIENDS
================================ */
router.get("/", auth, async (req, res) => {
  try {
    const userId = Number(req.user?.userId);

    if (!Number.isInteger(userId)) {
      return res.status(403).json({ error: "Unable to identify user." });
    }

    // Get accepted friendships where current user is either sender or receiver
    const sentFriendships = await prisma.friend.findMany({
      where: {
        userId,
        status: "accepted",
      },
      include: {
        friend: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const receivedFriendships = await prisma.friend.findMany({
      where: {
        friendId: userId,
        status: "accepted",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const friends = [
      ...sentFriendships.map((f) => f.friend),
      ...receivedFriendships.map((f) => f.user),
    ];

    res.json({ friends });
  } catch (error) {
    console.error("❌ Error fetching friends:", error);
    res.status(500).json({ error: "Failed to fetch friends." });
  }
});

/* ================================
   📬 GET PENDING FRIEND REQUESTS
================================ */
router.get("/requests", auth, async (req, res) => {
  try {
    const userId = Number(req.user?.userId);

    if (!Number.isInteger(userId)) {
      return res.status(403).json({ error: "Unable to identify user." });
    }

    // Get pending requests where current user is the recipient
    const requests = await prisma.friend.findMany({
      where: {
        friendId: userId,
        status: "pending",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const friendRequests = requests.map((r) => ({
      requestId: r.id,
      ...r.user,
      createdAt: r.createdAt,
    }));

    res.json({ requests: friendRequests });
  } catch (error) {
    console.error("❌ Error fetching friend requests:", error);
    res.status(500).json({ error: "Failed to fetch friend requests." });
  }
});

/* ================================
   ✅ ACCEPT FRIEND REQUEST
================================ */
router.post("/accept/:requestId", auth, async (req, res) => {
  try {
    const userId = Number(req.user?.userId);
    const requestId = Number(req.params.requestId);

    if (!Number.isInteger(userId) || !Number.isInteger(requestId)) {
      return res.status(400).json({ error: "Invalid IDs." });
    }

    // Find the pending request
    const request = await prisma.friend.findFirst({
      where: {
        id: requestId,
        friendId: userId,
        status: "pending",
      },
    });

    if (!request) {
      return res.status(404).json({ error: "Friend request not found." });
    }

    // Accept the request and create reverse friendship
    await prisma.$transaction([
      // Update original request to accepted
      prisma.friend.update({
        where: { id: requestId },
        data: { status: "accepted" },
      }),
      // Create reverse friendship
      prisma.friend.create({
        data: {
          userId,
          friendId: request.userId,
          status: "accepted",
        },
      }),
    ]);

    res.json({ message: "Friend request accepted." });
  } catch (error) {
    console.error("❌ Error accepting friend request:", error);
    res.status(500).json({ error: "Failed to accept friend request." });
  }
});

/* ================================
   ❌ DECLINE FRIEND REQUEST
================================ */
router.post("/decline/:requestId", auth, async (req, res) => {
  try {
    const userId = Number(req.user?.userId);
    const requestId = Number(req.params.requestId);

    if (!Number.isInteger(userId) || !Number.isInteger(requestId)) {
      return res.status(400).json({ error: "Invalid IDs." });
    }

    // Find and delete the pending request
    const request = await prisma.friend.findFirst({
      where: {
        id: requestId,
        friendId: userId,
        status: "pending",
      },
    });

    if (!request) {
      return res.status(404).json({ error: "Friend request not found." });
    }

    await prisma.friend.delete({
      where: { id: requestId },
    });

    res.json({ message: "Friend request declined." });
  } catch (error) {
    console.error("❌ Error declining friend request:", error);
    res.status(500).json({ error: "Failed to decline friend request." });
  }
});

/* ================================
   🗑️ REMOVE FRIEND
================================ */
router.delete("/:friendId", auth, async (req, res) => {
  try {
    const userId = Number(req.user?.userId);
    const friendId = Number(req.params.friendId);

    if (!Number.isInteger(userId) || !Number.isInteger(friendId)) {
      return res.status(400).json({ error: "Invalid user IDs." });
    }

    // Delete both directions of the friendship
    await prisma.$transaction([
      prisma.friend.deleteMany({
        where: { userId, friendId },
      }),
      prisma.friend.deleteMany({
        where: { userId: friendId, friendId: userId },
      }),
    ]);

    res.json({ message: "Friend removed successfully." });
  } catch (error) {
    console.error("❌ Error removing friend:", error);
    res.status(500).json({ error: "Failed to remove friend." });
  }
});

/* ================================
   🔍 SEARCH USERS (for adding friends)
================================ */
router.get("/search", auth, async (req, res) => {
  try {
    const userId = Number(req.user?.userId);
    const { query } = req.query;

    if (!query || query.trim().length === 0) {
      return res.json({ users: [] });
    }

    const searchTerm = query.trim();
    const searchLower = searchTerm.toLowerCase();

    // Find users matching search term
    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: userId } }, // Exclude current user
          {
            OR: [
              { name: { contains: searchTerm, mode: "insensitive" } },
              { email: { contains: searchTerm, mode: "insensitive" } },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      take: 20, // Limit results
    });

    // Get current user's friend relationships (both directions and all statuses)
    const sentRequests = await prisma.friend.findMany({
      where: { userId },
      select: { friendId: true, status: true },
    });

    const receivedRequests = await prisma.friend.findMany({
      where: { friendId: userId },
      select: { id: true, userId: true, status: true, createdAt: true },
    });

    // Build status maps; store objects so we can include request id for received pending requests
    const friendStatusMap = new Map();
    sentRequests.forEach((r) => friendStatusMap.set(r.friendId, { status: r.status }));
    receivedRequests.forEach((r) => {
      const existing = friendStatusMap.get(r.userId);
      // If already accepted in sentRequests, keep accepted
      if (existing && existing.status === 'accepted') return;
      const status = r.status === 'pending' ? 'received' : r.status;
      friendStatusMap.set(r.userId, { status, requestId: r.id, requestCreatedAt: r.createdAt });
    });

    const usersWithStatus = users.map((user) => {
      const entry = friendStatusMap.get(user.id) || { status: 'none' };
      const status = entry.status;
      const friendRequestId = entry.requestId || null;
      const isExactMatch =
        user.name.toLowerCase() === searchLower ||
        user.email.toLowerCase() === searchLower;

      return {
        ...user,
        friendStatus: status, // "none", "pending", "received", "accepted"
        friendRequestId,
        isExactMatch,
      };
    });

    // Sort: exact matches first, then alphabetically
    usersWithStatus.sort((a, b) => {
      if (a.isExactMatch && !b.isExactMatch) return -1;
      if (!a.isExactMatch && b.isExactMatch) return 1;
      return a.name.localeCompare(b.name);
    });

    res.json({ users: usersWithStatus });
  } catch (error) {
    console.error("❌ Error searching users:", error);
    res.status(500).json({ error: "Failed to search users." });
  }
});

export default router;
