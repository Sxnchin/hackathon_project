/**
 * Security Utilities
 * Input validation, sanitization, and security helpers
 */

import xss from 'xss';
import Joi from 'joi';
import crypto from 'crypto';

/**
 * Sanitize user input to prevent XSS attacks
 */
export function sanitizeInput(input) {
  if (typeof input === 'string') {
    return xss(input.trim());
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return input;
}

/**
 * Validation schemas using Joi
 */
export const schemas = {
  // User registration
  userRegister: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(128).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required()
      .messages({
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      }),
    walletAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).optional(),
  }),

  // User login
  userLogin: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  // Pot creation
  potCreate: Joi.object({
    name: Joi.string().min(2).max(200).required(),
    members: Joi.array().items(
      Joi.object({
        userId: Joi.number().integer().positive().required(),
        share: Joi.number().min(0).max(100).required(),
      })
    ).min(1).required(),
  }),

  // Receipt creation
  receiptCreate: Joi.object({
    potId: Joi.number().integer().positive().required(),
    amount: Joi.number().positive().required(),
    merchantName: Joi.string().min(1).max(200).required(),
    description: Joi.string().max(1000).optional(),
    purchaseDate: Joi.date().max('now').optional(),
    currency: Joi.string().length(3).uppercase().optional(),
    autoMint: Joi.boolean().optional(),
  }),

  // NFT minting
  nftMint: Joi.object({
    receiptId: Joi.number().integer().positive().required(),
    recipientAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  }),

  // Ethereum address
  ethereumAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),

  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

/**
 * Validate request data against schema
 */
export function validate(schema, data) {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));
    
    return { valid: false, errors, value: null };
  }

  return { valid: true, errors: null, value };
}

/**
 * Validation middleware factory
 */
export function validateRequest(schema, source = 'body') {
  return (req, res, next) => {
    const data = req[source];
    const { valid, errors, value } = validate(schema, data);

    if (!valid) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: errors,
      });
    }

    // Replace request data with validated and sanitized data
    req[source] = sanitizeInput(value);
    next();
  };
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash sensitive data
 */
export function hashData(data, algorithm = 'sha256') {
  return crypto.createHash(algorithm).update(data).digest('hex');
}

/**
 * Verify Ethereum signature
 */
import { ethers } from 'ethers';

export function verifySignature(message, signature, expectedAddress) {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch (error) {
    return false;
  }
}

/**
 * Check if address is valid Ethereum address
 */
export function isValidEthereumAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Mask sensitive data for logging
 */
export function maskSensitiveData(data, fields = ['password', 'privateKey', 'secret', 'token']) {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const masked = Array.isArray(data) ? [...data] : { ...data };

  for (const key in masked) {
    if (fields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      masked[key] = '***REDACTED***';
    } else if (typeof masked[key] === 'object') {
      masked[key] = maskSensitiveData(masked[key], fields);
    }
  }

  return masked;
}

/**
 * Rate limit key generator
 */
export function getRateLimitKey(req, identifier = 'ip') {
  switch (identifier) {
    case 'ip':
      return req.ip || req.connection.remoteAddress;
    case 'user':
      return req.user?.id || 'anonymous';
    case 'email':
      return req.body?.email || 'unknown';
    default:
      return 'default';
  }
}

/**
 * CSRF Token generation and validation
 */
const csrfTokens = new Map();

export function generateCSRFToken(sessionId) {
  const token = generateSecureToken();
  csrfTokens.set(sessionId, {
    token,
    expires: Date.now() + 3600000, // 1 hour
  });
  return token;
}

export function validateCSRFToken(sessionId, token) {
  const stored = csrfTokens.get(sessionId);
  
  if (!stored) {
    return false;
  }

  if (Date.now() > stored.expires) {
    csrfTokens.delete(sessionId);
    return false;
  }

  return stored.token === token;
}

/**
 * SQL Injection prevention helpers
 * Note: Prisma already prevents SQL injection, but these are extra safeguards
 */
export function sanitizeSQLInput(input) {
  if (typeof input !== 'string') {
    return input;
  }
  
  // Remove potentially dangerous SQL characters
  return input.replace(/['";\\]/g, '');
}

/**
 * Check if request is from localhost (for admin endpoints)
 */
export function isLocalRequest(req) {
  const ip = req.ip || req.connection.remoteAddress;
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}

/**
 * Timing-safe string comparison
 */
export function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(a, 'utf8'),
    Buffer.from(b, 'utf8')
  );
}

export default {
  sanitizeInput,
  schemas,
  validate,
  validateRequest,
  generateSecureToken,
  hashData,
  verifySignature,
  isValidEthereumAddress,
  maskSensitiveData,
  getRateLimitKey,
  generateCSRFToken,
  validateCSRFToken,
  sanitizeSQLInput,
  isLocalRequest,
  timingSafeEqual,
};
