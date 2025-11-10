// ...existing code...
import express from "express";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { generateToken, auth } from "../middleware/auth.js";
import { validatePassword } from "../utils/passwordValidator.js";
import querystring from 'querystring';
const router = express.Router();
const prisma = new PrismaClient();

// Set balance for user (demo only)
router.post('/set-balance', async (req, res) => {
  const { email, name, balance } = req.body;
  if (!email || !name) {
    return res.status(400).json({ error: 'Missing email or name' });
  }
  const b = Number(balance);
  if (!Number.isFinite(b)) return res.status(400).json({ error: 'Invalid balance' });
  try {
    // Upsert user with balance
    const user = await prisma.user.upsert({
      where: { email },
      update: { balance: b },
      create: { email, name, password: '', balance: b },
    });
    res.json({ user });
  } catch (err) {
    console.error('Set balance error:', err);
    res.status(500).json({ error: 'Could not set balance' });
  }
});

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

// ===== Google OAuth Start =====
router.get('/google', (req, res) => {
  const frontend = process.env.FRONTEND_URL || 'http://localhost:3000';
  const callback = process.env.GOOGLE_CALLBACK_URL || `${process.env.BACKEND_URL || 'http://localhost:4000'}/auth/google/callback`;

  // Defensive check: ensure required env vars are present and give a helpful error instead of redirecting to Google
  const missing = [];
  if (!process.env.GOOGLE_CLIENT_ID) missing.push('GOOGLE_CLIENT_ID');
  if (!process.env.GOOGLE_CLIENT_SECRET) missing.push('GOOGLE_CLIENT_SECRET');
  if (missing.length > 0) {
    const msg = `Google OAuth is not configured on the server. Missing environment variable(s): ${missing.join(', ')}.\n\n` +
      `Set these in your backend .env and restart the server. Example:\nGOOGLE_CLIENT_ID=your-google-client-id\nGOOGLE_CLIENT_SECRET=your-google-client-secret\nGOOGLE_CALLBACK_URL=${callback}\nFRONTEND_URL=${frontend}`;
    console.error(msg);
    return res.status(500).send(`<pre style="white-space:pre-wrap">${msg}</pre>`);
  }

  const params = {
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: callback,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent'
  };
  const url = `https://accounts.google.com/o/oauth2/v2/auth?${querystring.stringify(params)}`;
  return res.redirect(url);
});

// ===== Google OAuth Callback =====
router.get('/google/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('Missing code');

  try {
    const tokenEndpoint = process.env.GOOGLE_TOKEN_URL || 'https://oauth2.googleapis.com/token';
    const userinfoEndpoint = process.env.GOOGLE_USERINFO_URL || 'https://www.googleapis.com/oauth2/v2/userinfo';

    const tokenRes = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: querystring.stringify({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_CALLBACK_URL || `${process.env.BACKEND_URL || 'http://localhost:4000'}/auth/google/callback`,
        grant_type: 'authorization_code'
      })
    });

    const tokenJson = await tokenRes.json();
    const accessToken = tokenJson.access_token;
    const idToken = tokenJson.id_token;

    // Fetch user info
    const profileRes = await fetch(userinfoEndpoint, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const profile = await profileRes.json();

    // profile contains: id, email, verified_email, name, given_name, family_name, picture, locale
    const email = profile.email;
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Create a placeholder user (password empty) - user will complete profile
      user = await prisma.user.create({ data: { email, name: profile.name || '', password: '' } });
    }

    const token = generateToken(user.id);

    // Set httpOnly cookie for auth (will be used by frontend when calling backend APIs)
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('ls_token', token, {
      httpOnly: true,
      secure: isProd, // secure in production (requires HTTPS)
      sameSite: isProd ? 'None' : 'Lax',
      maxAge: 2 * 60 * 60 * 1000, // 2 hours
      path: '/',
    });

    // Redirect user back to the frontend home so they land on the app root after auth
    // (frontend can then call /auth/me to bootstrap the session and show the correct UI)
    const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectUrl = `${frontend.replace(/\/$/, '')}/`;
    return res.redirect(redirectUrl);
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    return res.status(500).send('OAuth error');
  }
});

// ===== Complete Profile (set username/name) =====
router.post('/complete-profile', auth, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || username.trim().length === 0) return res.status(400).json({ error: 'Username required' });

    const updated = await prisma.user.update({ where: { id: req.user.userId }, data: { name: username.trim() } });

    // Issue a fresh token and set cookie again (cookie-only response)
    const token = generateToken(updated.id);
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('ls_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'None' : 'Lax',
      maxAge: 2 * 60 * 60 * 1000,
      path: '/',
    });

    res.json({ user: { id: updated.id, email: updated.email, name: updated.name } });
  } catch (err) {
    console.error('Complete profile error:', err);
    res.status(500).json({ error: 'Could not complete profile' });
  }
});

// ===== Get current user (session-based) =====
router.get('/me', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { id: true, email: true, name: true } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    console.error('Error fetching current user', err);
    res.status(500).json({ error: 'Could not fetch user' });
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

export default router;
