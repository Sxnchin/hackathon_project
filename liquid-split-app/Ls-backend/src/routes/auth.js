// ...existing code...
import express from "express";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { generateToken, auth } from "../middleware/auth.js";
import { validatePassword } from "../utils/passwordValidator.js";
const router = express.Router();
const prisma = new PrismaClient();

// Register
router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "All fields required" });

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: "Email already in use" });

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, balance: 0 },
    });

    const token = generateToken(user.id);
    res.json({ token, user });
  } catch (err) {
    next(err);
  }
});

// Login
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    const token = generateToken(user.id);
    res.json({ token, user });
  } catch (err) {
    next(err);
  }
});

// List users (demo only)
router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, balance: true } });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch users' });
  }
});

// Change password (requires authentication)
router.post("/change-password", auth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Both current and new passwords are required" });
    }

    // Get user from database
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.userId } 
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify current password
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    // Check if new password is different from current
    const samePassword = await bcrypt.compare(newPassword, user.password);
    if (samePassword) {
      return res.status(400).json({ error: "New password must be different from current password" });
    }

    // Hash and update password
    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    next(err);
  }
});

// Reset password (no authentication required, but needs current password)
router.post("/reset-password", async (req, res, next) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    
    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({ error: "Email, current password, and new password are required" });
    }

    // Get user from database
    const user = await prisma.user.findUnique({ 
      where: { email } 
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify current password
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    // Check if new password is different from current
    const samePassword = await bcrypt.compare(newPassword, user.password);
    if (samePassword) {
      return res.status(400).json({ error: "New password must be different from current password" });
    }

    // Hash and update password
    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    next(err);
  }
});

// Delete account (requires authentication)
router.delete("/delete-account", auth, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // Check if user exists
    const user = await prisma.user.findUnique({ 
      where: { id: userId },
      include: {
        createdGroups: true,
        groupMemberships: true,
        createdPots: true,
        pots: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Delete user and all related data (cascading deletes handled by Prisma schema)
    await prisma.user.delete({
      where: { id: userId }
    });

    res.json({ message: "Account deleted successfully" });
  } catch (err) {
    next(err);
  }
});

export default router;
