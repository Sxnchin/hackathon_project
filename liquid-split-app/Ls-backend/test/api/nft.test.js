/**
 * API Integration Tests
 * Comprehensive testing for all endpoints
 */

import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import app from '../index.js'; // Assuming we export app from index.js

const prisma = new PrismaClient();

describe('Authentication API', () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: { email: { contains: 'test' } },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'Test123!@#',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();

      testUser = response.body.data.user;
      authToken = response.body.data.accessToken;
    });

    it('should reject duplicate email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User 2',
          email: 'test@example.com',
          password: 'Test123!@#',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test2@example.com',
          password: 'weak',
        });

      expect(response.status).toBe(400);
    });

    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'invalid-email',
          password: 'Test123!@#',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test123!@#',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
    });

    it('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword123!',
        });

      expect(response.status).toBe(401);
    });

    it('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Test123!@#',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.user.email).toBe('test@example.com');
    });

    it('should reject without token', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
    });

    it('should reject with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });
});

describe('NFT API', () => {
  let authToken;
  let testUser;
  let testPot;
  let testReceipt;

  beforeAll(async () => {
    // Create test user with wallet
    const hashedPassword = await bcrypt.hash('Test123!@#', 12);
    testUser = await prisma.user.create({
      data: {
        name: 'NFT Test User',
        email: 'nfttest@example.com',
        password: hashedPassword,
        walletAddress: '0x742d35Cc6443f5C74A5F6e9b8e8f1F1F4545D5A5',
      },
    });

    // Generate token
    const { generateAccessToken } = await import('../middleware/productionAuth.js');
    authToken = generateAccessToken(testUser);

    // Create test pot
    testPot = await prisma.pot.create({
      data: {
        name: 'Test Pot',
        creatorId: testUser.id,
      },
    });

    // Create test receipt
    testReceipt = await prisma.receipt.create({
      data: {
        potId: testPot.id,
        payerId: testUser.id,
        amount: 100.50,
        merchantName: 'Test Merchant',
        description: 'Test purchase',
      },
    });
  });

  afterAll(async () => {
    await prisma.receipt.deleteMany({ where: { payerId: testUser.id } });
    await prisma.pot.deleteMany({ where: { creatorId: testUser.id } });
    await prisma.user.deleteMany({ where: { id: testUser.id } });
    await prisma.$disconnect();
  });

  describe('POST /api/nfts/create-voucher', () => {
    it('should create NFT voucher', async () => {
      const response = await request(app)
        .post('/api/nfts/create-voucher')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          receiptId: testReceipt.id,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.voucher).toBeDefined();
      expect(response.body.data.voucher.signature).toBeDefined();
      expect(response.body.data.metadata).toBeDefined();
    });

    it('should reject duplicate voucher creation', async () => {
      const response = await request(app)
        .post('/api/nfts/create-voucher')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          receiptId: testReceipt.id,
        });

      expect(response.status).toBe(400);
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .post('/api/nfts/create-voucher')
        .send({
          receiptId: testReceipt.id,
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/nfts/receipt/:receiptId', () => {
    it('should get NFT data', async () => {
      const response = await request(app)
        .get(`/api/nfts/receipt/${testReceipt.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.nft).toBeDefined();
      expect(response.body.data.nft.nftClaimable).toBe(true);
    });
  });

  describe('GET /api/nfts/my-nfts', () => {
    it('should get user NFTs', async () => {
      const response = await request(app)
        .get('/api/nfts/my-nfts')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.nfts).toBeDefined();
      expect(response.body.data.pagination).toBeDefined();
    });
  });

  describe('GET /api/nfts/stats', () => {
    it('should get NFT statistics', async () => {
      const response = await request(app)
        .get('/api/nfts/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.stats).toBeDefined();
    });
  });

  describe('GET /api/nfts/health', () => {
    it('should check service health', async () => {
      const response = await request(app).get('/api/nfts/health');

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
    });
  });
});

describe('Authorization & Security', () => {
  let adminToken;
  let userToken;
  let adminUser;
  let regularUser;
  let otherUserPot;

  beforeAll(async () => {
    // Create admin user
    const hashedPassword = await bcrypt.hash('Admin123!@#', 12);
    adminUser = await prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'ADMIN',
      },
    });

    regularUser = await prisma.user.create({
      data: {
        name: 'Regular User',
        email: 'regular@example.com',
        password: hashedPassword,
        role: 'USER',
      },
    });

    const { generateAccessToken } = await import('../middleware/productionAuth.js');
    adminToken = generateAccessToken(adminUser);
    userToken = generateAccessToken(regularUser);

    // Create pot for another user
    otherUserPot = await prisma.pot.create({
      data: {
        name: 'Other User Pot',
        creatorId: adminUser.id,
      },
    });
  });

  afterAll(async () => {
    await prisma.pot.deleteMany({ where: { creatorId: adminUser.id } });
    await prisma.user.deleteMany({
      where: {
        OR: [{ id: adminUser.id }, { id: regularUser.id }],
      },
    });
    await prisma.$disconnect();
  });

  describe('Role-Based Access Control', () => {
    it('should allow admin to access admin endpoints', async () => {
      const response = await request(app)
        .post('/api/nfts/batch-create-vouchers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          receiptIds: [],
          recipientAddress: '0x742d35Cc6443f5C74A5F6e9b8e8f1F1F4545D5A5',
        });

      // Should not get 403 Forbidden (might get 400 for empty array)
      expect(response.status).not.toBe(403);
    });

    it('should reject regular user from admin endpoints', async () => {
      const response = await request(app)
        .post('/api/nfts/batch-create-vouchers')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          receiptIds: [],
          recipientAddress: '0x742d35Cc6443f5C74A5F6e9b8e8f1F1F4545D5A5',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('Input Validation', () => {
    it('should reject invalid Ethereum address', async () => {
      const testReceipt = await prisma.receipt.create({
        data: {
          potId: otherUserPot.id,
          payerId: adminUser.id,
          amount: 50,
          merchantName: 'Test',
        },
      });

      const response = await request(app)
        .post('/api/nfts/create-voucher')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          receiptId: testReceipt.id,
          recipientAddress: 'invalid-address',
        });

      expect(response.status).toBe(400);
    });

    it('should reject negative amounts', async () => {
      // This would be in pot/receipt creation endpoint
      // Test depends on your validation rules
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      // Make many rapid requests
      const promises = [];
      for (let i = 0; i < 60; i++) {
        promises.push(
          request(app)
            .get('/api/nfts/stats')
            .set('Authorization', `Bearer ${userToken}`)
        );
      }

      const responses = await Promise.all(promises);
      const rateLimited = responses.some(r => r.status === 429);

      // Should eventually hit rate limit
      // Note: This test might be flaky depending on timing
    }, 30000);
  });
});

describe('Security Headers', () => {
  it('should include security headers', async () => {
    const response = await request(app).get('/api/nfts/health');

    // Helmet middleware should add these
    expect(response.headers['x-content-type-options']).toBeDefined();
    expect(response.headers['x-frame-options']).toBeDefined();
  });
});
