/**
 * Production Authentication Routes
 * Secure user registration, login, token refresh
 */

import express from 'express';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { 
  generateAccessToken, 
  generateRefreshToken,
  verifyRefreshToken,
  authenticate,
} from '../middleware/productionAuth.js';
import { validateRequest, schemas } from '../utils/security.js';
import logger from '../utils/logger.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();
const prisma = new PrismaClient();

// Rate limiters
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 registration attempts per hour
  message: 'Too many accounts created from this IP, please try again later',
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per 15 minutes
  message: 'Too many login attempts, please try again later',
});

/**
 * POST /api/auth/register
 * Register new user
 */
router.post('/register', registerLimiter, validateRequest(schemas.userRegister), async (req, res) => {
  try {
    const { name, email, password, walletAddress } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'User with this email already exists',
      });
    }

    // Check if wallet address is already registered
    if (walletAddress) {
      const existingWallet = await prisma.user.findUnique({
        where: { walletAddress },
      });

      if (existingWallet) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Wallet address already registered',
        });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        walletAddress: walletAddress || null,
        role: 'USER',
      },
      select: {
        id: true,
        name: true,
        email: true,
        walletAddress: true,
        role: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_REGISTERED',
        resource: `User:${user.id}`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    logger.info(`New user registered: ${user.email} (ID: ${user.id})`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to register user',
    });
  }
});

/**
 * POST /api/auth/login
 * User login
 */
router.post('/login', loginLimiter, validateRequest(schemas.userLogin), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists or not
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid credentials',
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Account is inactive. Please contact support.',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      // Log failed login attempt
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN_FAILED',
          resource: `User:${user.id}`,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });

      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid credentials',
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Update user: save refresh token and last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken,
        lastLogin: new Date(),
      },
    });

    // Log successful login
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN_SUCCESS',
        resource: `User:${user.id}`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    logger.info(`User logged in: ${user.email} (ID: ${user.id})`);

    // Return user data (without password)
    const { password: _, refreshToken: __, ...userData } = user;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userData,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to login',
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Refresh token required',
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or expired refresh token',
      });
    }

    // Find user and verify stored refresh token
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid refresh token',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Account is inactive',
      });
    }

    // Generate new access token
    const accessToken = generateAccessToken(user);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken,
      },
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to refresh token',
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (invalidate refresh token)
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    // Clear refresh token
    await prisma.user.update({
      where: { id: req.user.id },
      data: { refreshToken: null },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'LOGOUT',
        resource: `User:${req.user.id}`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    logger.info(`User logged out: ${req.user.email} (ID: ${req.user.id})`);

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to logout',
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        walletAddress: true,
        role: true,
        balance: true,
        isActive: true,
        emailVerified: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get profile',
    });
  }
});

/**
 * PATCH /api/auth/wallet
 * Link wallet address to account
 */
router.patch('/wallet', authenticate, validateRequest(Joi.object({
  walletAddress: schemas.ethereumAddress,
  signature: Joi.string().required(),
  message: Joi.string().required(),
})), async (req, res) => {
  try {
    const { walletAddress, signature, message } = req.body;

    // Verify signature
    const { verifySignature } = await import('../utils/security.js');
    const isValid = verifySignature(message, signature, walletAddress);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid signature',
      });
    }

    // Check if wallet already linked
    const existingWallet = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (existingWallet && existingWallet.id !== req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Wallet address already linked to another account',
      });
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { walletAddress },
      select: {
        id: true,
        name: true,
        email: true,
        walletAddress: true,
        role: true,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'WALLET_LINKED',
        resource: `User:${req.user.id}`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { walletAddress },
      },
    });

    logger.info(`Wallet linked: ${walletAddress} to user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Wallet linked successfully',
      data: { user },
    });
  } catch (error) {
    logger.error('Wallet link error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to link wallet',
    });
  }
});

export default router;
