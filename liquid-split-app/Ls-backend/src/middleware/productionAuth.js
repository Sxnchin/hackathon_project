/**
 * Production Authentication & Authorization Middleware
 * Implements JWT-based auth with refresh tokens, role-based access control
 */

import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'; // Short-lived access tokens
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'; // Long-lived refresh tokens

/**
 * Generate JWT access token
 */
export function generateAccessToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      walletAddress: user.walletAddress,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Generate JWT refresh token
 */
export function generateRefreshToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
    },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );
}

/**
 * Verify JWT access token
 */
export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Verify JWT refresh token
 */
export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Authentication Middleware - Verifies JWT token
 * Adds user object to req.user
 */
export async function authenticate(req, res, next) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'No authentication token provided',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyAccessToken(token);
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
    }

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        walletAddress: true,
        isActive: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not found',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Account is inactive',
      });
    }

    // Attach user to request
    req.user = user;
    
    // Log authentication
    await logAudit(user.id, 'AUTH_SUCCESS', null, req);

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Authentication failed',
    });
  }
}

/**
 * Optional Authentication - Doesn't fail if no token
 * Useful for public endpoints that have enhanced features for authenticated users
 */
export async function optionalAuthenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);
    
    if (!decoded) {
      req.user = null;
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        walletAddress: true,
        isActive: true,
      },
    });

    req.user = user && user.isActive ? user : null;
    next();
  } catch (error) {
    req.user = null;
    next();
  }
}

/**
 * Authorization Middleware - Check user roles
 * Usage: authorize(['ADMIN', 'MODERATOR'])
 */
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`Authorization failed for user ${req.user.id}: required ${allowedRoles}, has ${req.user.role}`);
      
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Insufficient permissions',
      });
    }

    next();
  };
}

/**
 * Resource Ownership Middleware - Verify user owns the resource
 * Usage: verifyOwnership('pot', 'potId') or verifyOwnership('receipt', 'receiptId')
 */
export function verifyOwnership(resourceType, paramName) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      // Support both req.params and req.body (e.g., 'body.receiptId')
      let resourceId;
      if (paramName.startsWith('body.')) {
        const bodyKey = paramName.replace('body.', '');
        resourceId = parseInt(req.body[bodyKey]);
      } else {
        resourceId = parseInt(req.params[paramName]);
      }
      
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Invalid resource ID',
        });
      }

      let isOwner = false;

      switch (resourceType) {
        case 'pot':
          const pot = await prisma.pot.findUnique({
            where: { id: resourceId },
            include: {
              members: {
                where: { userId: req.user.id },
              },
            },
          });
          
          isOwner = pot && (pot.creatorId === req.user.id || pot.members.length > 0);
          break;

        case 'receipt':
          const receipt = await prisma.receipt.findUnique({
            where: { id: resourceId },
          });
          
          isOwner = receipt && receipt.payerId === req.user.id;
          
          // Also allow if user is a member of the pot
          if (!isOwner && receipt) {
            const potMember = await prisma.potMember.findFirst({
              where: {
                potId: receipt.potId,
                userId: req.user.id,
              },
            });
            isOwner = !!potMember;
          }
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Bad Request',
            message: 'Invalid resource type',
          });
      }

      // Allow admins to bypass ownership checks
      if (!isOwner && req.user.role !== 'ADMIN') {
        logger.warn(`Ownership verification failed: user ${req.user.id} attempted to access ${resourceType} ${resourceId}`);
        
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'You do not have permission to access this resource',
        });
      }

      next();
    } catch (error) {
      logger.error('Ownership verification error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Ownership verification failed',
      });
    }
  };
}

/**
 * Wallet Address Verification - Ensure user owns the wallet
 */
export function verifyWalletOwnership(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }

  const walletAddress = req.body.walletAddress || req.query.walletAddress;
  
  if (!walletAddress) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: 'Wallet address required',
    });
  }

  // Normalize addresses for comparison
  const normalizedWallet = walletAddress.toLowerCase();
  const normalizedUserWallet = req.user.walletAddress?.toLowerCase();

  if (normalizedWallet !== normalizedUserWallet && req.user.role !== 'ADMIN') {
    logger.warn(`Wallet verification failed: user ${req.user.id} attempted to use wallet ${walletAddress}`);
    
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Wallet address does not match your account',
    });
  }

  next();
}

/**
 * Rate Limit by User - Additional rate limiting per authenticated user
 * Prevents abuse from authenticated accounts
 */
export function rateLimitByUser(maxRequests = 100, windowMs = 60000) {
  const userRequests = new Map();

  return (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const userId = req.user.id;
    const now = Date.now();
    
    if (!userRequests.has(userId)) {
      userRequests.set(userId, []);
    }

    const requests = userRequests.get(userId);
    
    // Remove old requests outside the window
    const recentRequests = requests.filter(timestamp => now - timestamp < windowMs);
    
    if (recentRequests.length >= maxRequests) {
      logger.warn(`Rate limit exceeded for user ${userId}`);
      
      return res.status(429).json({
        success: false,
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
      });
    }

    recentRequests.push(now);
    userRequests.set(userId, recentRequests);
    
    next();
  };
}

/**
 * Audit logging helper
 */
async function logAudit(userId, action, resource, req) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        metadata: {
          method: req.method,
          path: req.path,
          timestamp: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    logger.error('Audit logging failed:', error);
  }
}

export default {
  authenticate,
  optionalAuthenticate,
  authorize,
  verifyOwnership,
  verifyWalletOwnership,
  rateLimitByUser,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
