/**
 * Production-Ready Server Entry Point
 * Implements all security best practices, comprehensive logging, and error handling
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { PrismaClient } from '@prisma/client';
import logger from './utils/logger.js';

// Import production routes
import productionAuthRoutes from './routes/productionAuth.js';
import productionNFTRoutes from './routes/productionNFT.js';
import potRoutes from './routes/pots.js';
import authRoutes from './routes/auth.js';
import transactionsRoutes from './routes/transactions.js';
import stripeRoutes, { stripeWebhook } from './routes/stripe.js';
import { auth } from './middleware/auth.js';

dotenv.config();

// ===== Environment Validation =====
const requiredEnv = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'NFT_CONTRACT_ADDRESS',
  'PRIVATE_KEY',
  'PINATA_API_KEY',
  'PINATA_SECRET_KEY',
];

const missingEnv = requiredEnv.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
  logger.error(`❌ Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

// ===== Initialize App & Database =====
const app = express();
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production' 
    ? ['error', 'warn'] 
    : ['query', 'error', 'warn'],
});

// Test database connection
prisma.$connect()
  .then(() => logger.info('✅ Database connected successfully'))
  .catch((error) => {
    logger.error('❌ Database connection failed:', error);
    process.exit(1);
  });

// ===== Proxy & Trust Settings =====
if (process.env.NODE_ENV === 'production') {
  app.enable('trust proxy');
  
  // HTTPS redirect in production
  app.use((req, res, next) => {
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      return next();
    }
    return res.redirect(`https://${req.headers.host}${req.url}`);
  });
}

// ===== Security Middlewares =====
app.disable('x-powered-by'); // Hide Express server info

// Helmet - comprehensive security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", 'https://api.pinata.cloud', 'https://gateway.pinata.cloud'],
        imgSrc: ["'self'", 'data:', 'https://gateway.pinata.cloud'],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'", 'data:'],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// ===== Stripe Webhook (RAW BODY REQUIRED) =====
// MUST be before express.json()
app.post('/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// ===== Body Parsing =====
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ===== Rate Limiting =====
// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded: IP ${req.ip}, Path: ${req.path}`);
    res.status(429).json({
      success: false,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
    });
  },
});
app.use(globalLimiter);

// Stricter rate limit for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many authentication attempts, please try again later',
});

// ===== Request Logging =====
// Use Winston for production, Morgan for development
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

// Log all requests with additional context
app.use((req, res, next) => {
  logger.info({
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
  next();
});

// ===== Health Check =====
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: 'connected',
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: 'Database connection failed',
    });
  }
});

// ===== API Routes =====
// Production routes with full security
app.use('/api/auth', authLimiter, productionAuthRoutes);
app.use('/api/nfts', productionNFTRoutes);

// Legacy routes (keeping for backward compatibility)
app.use('/auth', authRoutes);
app.use('/pots', auth, potRoutes);
app.use('/transactions', auth, transactionsRoutes);
app.use('/stripe', stripeRoutes);

// ===== 404 Handler =====
app.use((req, res) => {
  logger.warn(`404 Not Found: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: 'The requested resource was not found',
    path: req.path,
  });
});

// ===== Global Error Handler =====
app.use((err, req, res, next) => {
  // Log error with full context
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    body: req.body,
    params: req.params,
    query: req.query,
    user: req.user?.id,
  });

  // Determine status code
  const status = err.status || err.statusCode || 500;

  // Prepare error response
  const errorResponse = {
    success: false,
    error: err.name || 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An error occurred while processing your request'
      : err.message,
  };

  // Include stack trace in development
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.stack = err.stack;
  }

  res.status(status).json(errorResponse);
});

// ===== Graceful Shutdown =====
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', { reason, promise });
  process.exit(1);
});

// ===== Start Server =====
const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => {
  logger.info(`🚀 Production server running on port ${PORT}`);
  logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔐 Security: Helmet enabled, CORS configured, Rate limiting active`);
  logger.info(`🎨 NFT Contract: ${process.env.NFT_CONTRACT_ADDRESS}`);
  logger.info(`⛓️  Network: ${process.env.POLYGON_ZKEVM_RPC}`);
});

// Export for testing
export default app;
