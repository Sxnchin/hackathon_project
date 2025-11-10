/**
 * Production NFT Routes
 * Secure NFT operations with lazy minting, batch operations, and proper authorization
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import ProductionNFTService from '../services/productionNFT.js';
import {
  authenticate,
  authorize,
  verifyOwnership,
  verifyWalletOwnership,
} from '../middleware/productionAuth.js';
import { validateRequest, schemas } from '../utils/security.js';
import logger from '../utils/logger.js';
import rateLimit from 'express-rate-limit';
import Joi from 'joi';

const router = express.Router();
const prisma = new PrismaClient();
const nftService = new ProductionNFTService();

// Rate limiters
const mintLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 mints per hour per user
  message: 'Too many mint requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const claimLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100, // 100 claims per hour
  message: 'Too many claim requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/nfts/create-voucher
 * Create lazy mint voucher (off-chain, no gas cost)
 */
router.post(
  '/create-voucher',
  authenticate,
  mintLimiter,
  validateRequest(Joi.object({
    receiptId: Joi.number().integer().positive().required(),
    recipientAddress: schemas.ethereumAddress.optional(),
  })),
  verifyOwnership('receipt', 'body.receiptId'),
  async (req, res) => {
    try {
      const { receiptId, recipientAddress } = req.body;

      // Get receipt data
      const receipt = await prisma.receipt.findUnique({
        where: { id: receiptId },
        include: {
          pot: {
            select: { name: true },
          },
        },
      });

      if (!receipt) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Receipt not found',
        });
      }

      // Check if already has voucher or is minted
      if (receipt.nftMinted || receipt.nftClaimable) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'NFT already minted or voucher already created',
        });
      }

      // Use user's wallet address or provided address
      const recipient = recipientAddress || req.user.walletAddress;

      if (!recipient) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Wallet address required. Please link your wallet or provide recipient address',
        });
      }

      // Create receipt data for NFT metadata
      const receiptData = {
        id: receipt.id,
        potId: receipt.potId,
        merchantName: receipt.merchantName || receipt.pot.name,
        amount: receipt.amount,
        purchaseDate: receipt.purchaseDate || receipt.timestamp,
        currency: receipt.currency,
        description: receipt.description,
      };

      // Create lazy mint voucher
      const { voucher, metadata, ipfsHash, ipfsUrl } = 
        await nftService.createLazyMintVoucher(receiptData, recipient);

      // Update receipt with voucher info
      await prisma.$transaction(async (tx) => {
        await tx.receipt.update({
          where: { id: receiptId },
          data: {
            nftClaimable: true,
            nftTokenId: voucher.tokenId.toString(),
            nftVoucherSig: voucher.signature,
            nftVoucherNonce: voucher.nonce.toString(),
            nftOwner: recipient,
            nftIpfsHash: ipfsHash,
            nftMetadataUrl: ipfsUrl,
            nftContractAddr: process.env.NFT_CONTRACT_ADDRESS,
            nftOpenseaUrl: `https://testnets.opensea.io/assets/cardona/${process.env.NFT_CONTRACT_ADDRESS}/${voucher.tokenId}`,
            nftEtherscanUrl: `https://cardona-zkevm.polygonscan.com/token/${process.env.NFT_CONTRACT_ADDRESS}?a=${voucher.tokenId}`,
          },
        });

        // Log audit
        await tx.auditLog.create({
          data: {
            userId: req.user.id,
            action: 'NFT_VOUCHER_CREATED',
            resource: `Receipt:${receiptId}`,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            metadata: {
              tokenId: voucher.tokenId.toString(),
              recipient,
            },
          },
        });
      });

      logger.info(`NFT voucher created for receipt ${receiptId} by user ${req.user.id}`);

      res.json({
        success: true,
        message: 'NFT voucher created successfully (no gas cost yet)',
        data: {
          voucher,
          metadata,
          ipfsUrl,
          claimInstructions: 'Use /api/nfts/claim endpoint to mint on-chain when ready',
        },
      });
    } catch (error) {
      logger.error('Create voucher error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to create NFT voucher',
      });
    }
  }
);

/**
 * POST /api/nfts/claim
 * Claim NFT on-chain (user pays gas)
 */
router.post(
  '/claim',
  authenticate,
  claimLimiter,
  validateRequest(Joi.object({
    receiptId: Joi.number().integer().positive().required(),
  })),
  async (req, res) => {
    try {
      const { receiptId } = req.body;

      // Get receipt with voucher
      const receipt = await prisma.receipt.findUnique({
        where: { id: receiptId },
      });

      if (!receipt) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Receipt not found',
        });
      }

      if (!receipt.nftClaimable) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'No voucher exists for this receipt. Create voucher first',
        });
      }

      if (receipt.nftClaimed) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'NFT already claimed',
        });
      }

      // Reconstruct voucher
      const voucher = {
        tokenId: receipt.nftTokenId,
        uri: receipt.nftMetadataUrl,
        recipient: receipt.nftOwner,
        receiptId: receipt.id,
        nonce: parseInt(receipt.nftVoucherNonce),
        signature: receipt.nftVoucherSig,
      };

      // Claim NFT on-chain
      const result = await nftService.claimNFT(voucher);

      // Update receipt
      await prisma.$transaction(async (tx) => {
        await tx.receipt.update({
          where: { id: receiptId },
          data: {
            nftMinted: true,
            nftClaimed: true,
            nftTxHash: result.transactionHash,
            nftMintedAt: new Date(),
          },
        });

        // Log audit
        await tx.auditLog.create({
          data: {
            userId: req.user.id,
            action: 'NFT_CLAIMED',
            resource: `Receipt:${receiptId}`,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            metadata: {
              transactionHash: result.transactionHash,
              tokenId: result.tokenId,
              gasUsed: result.gasUsed,
            },
          },
        });
      });

      logger.info(`NFT claimed for receipt ${receiptId} by user ${req.user.id}. TX: ${result.transactionHash}`);

      res.json({
        success: true,
        message: 'NFT claimed successfully',
        data: {
          transactionHash: result.transactionHash,
          tokenId: result.tokenId,
          blockNumber: result.blockNumber,
          gasUsed: result.gasUsed,
          openseaUrl: receipt.nftOpenseaUrl,
          etherscanUrl: `https://cardona-zkevm.polygonscan.com/tx/${result.transactionHash}`,
        },
      });
    } catch (error) {
      logger.error('Claim NFT error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message || 'Failed to claim NFT',
      });
    }
  }
);

/**
 * POST /api/nfts/batch-create-vouchers
 * Create vouchers for multiple receipts (admin only)
 */
router.post(
  '/batch-create-vouchers',
  authenticate,
  authorize('ADMIN', 'MODERATOR'),
  validateRequest(Joi.object({
    receiptIds: Joi.array().items(Joi.number().integer().positive()).min(1).max(100).required(),
    recipientAddress: schemas.ethereumAddress.required(),
  })),
  async (req, res) => {
    try {
      const { receiptIds, recipientAddress } = req.body;

      const results = [];
      const errors = [];

      for (const receiptId of receiptIds) {
        try {
          const receipt = await prisma.receipt.findUnique({
            where: { id: receiptId },
            include: { pot: { select: { name: true } } },
          });

          if (!receipt || receipt.nftClaimable) {
            errors.push({ receiptId, error: 'Receipt not found or voucher exists' });
            continue;
          }

          const receiptData = {
            id: receipt.id,
            potId: receipt.potId,
            merchantName: receipt.merchantName || receipt.pot.name,
            amount: receipt.amount,
            purchaseDate: receipt.purchaseDate || receipt.timestamp,
            currency: receipt.currency,
            description: receipt.description,
          };

          const { voucher, ipfsHash, ipfsUrl } = 
            await nftService.createLazyMintVoucher(receiptData, recipientAddress);

          await prisma.receipt.update({
            where: { id: receiptId },
            data: {
              nftClaimable: true,
              nftTokenId: voucher.tokenId.toString(),
              nftVoucherSig: voucher.signature,
              nftVoucherNonce: voucher.nonce.toString(),
              nftOwner: recipientAddress,
              nftIpfsHash: ipfsHash,
              nftMetadataUrl: ipfsUrl,
              nftContractAddr: process.env.NFT_CONTRACT_ADDRESS,
            },
          });

          results.push({ receiptId, tokenId: voucher.tokenId });
        } catch (error) {
          errors.push({ receiptId, error: error.message });
        }
      }

      // Log audit
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'NFT_BATCH_VOUCHER_CREATED',
          resource: `Batch:${receiptIds.length}`,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          metadata: { count: results.length, errors: errors.length },
        },
      });

      logger.info(`Batch vouchers created by user ${req.user.id}: ${results.length} success, ${errors.length} errors`);

      res.json({
        success: true,
        message: `Created ${results.length} vouchers`,
        data: { results, errors },
      });
    } catch (error) {
      logger.error('Batch create vouchers error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to create batch vouchers',
      });
    }
  }
);

/**
 * GET /api/nfts/receipt/:receiptId
 * Get NFT data for a receipt
 */
router.get(
  '/receipt/:receiptId',
  authenticate,
  verifyOwnership('receipt', 'receiptId'),
  async (req, res) => {
    try {
      const receiptId = parseInt(req.params.receiptId);

      const receipt = await prisma.receipt.findUnique({
        where: { id: receiptId },
        select: {
          id: true,
          nftMinted: true,
          nftClaimable: true,
          nftClaimed: true,
          nftTokenId: true,
          nftTxHash: true,
          nftContractAddr: true,
          nftIpfsHash: true,
          nftMetadataUrl: true,
          nftOwner: true,
          nftMintedAt: true,
          nftOpenseaUrl: true,
          nftEtherscanUrl: true,
        },
      });

      if (!receipt) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Receipt not found',
        });
      }

      res.json({
        success: true,
        data: { nft: receipt },
      });
    } catch (error) {
      logger.error('Get NFT data error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to get NFT data',
      });
    }
  }
);

/**
 * GET /api/nfts/my-nfts
 * Get all NFTs owned by authenticated user
 */
router.get('/my-nfts', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const [nfts, total] = await Promise.all([
      prisma.receipt.findMany({
        where: {
          nftMinted: true,
          nftOwner: req.user.walletAddress,
        },
        select: {
          id: true,
          amount: true,
          merchantName: true,
          purchaseDate: true,
          nftTokenId: true,
          nftTxHash: true,
          nftMetadataUrl: true,
          nftMintedAt: true,
          nftOpenseaUrl: true,
          nftEtherscanUrl: true,
          pot: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { nftMintedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.receipt.count({
        where: {
          nftMinted: true,
          nftOwner: req.user.walletAddress,
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        nfts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Get my NFTs error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get NFTs',
    });
  }
});

/**
 * GET /api/nfts/stats
 * Get NFT statistics
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const stats = await prisma.receipt.aggregate({
      where: {
        nftOwner: req.user.walletAddress,
      },
      _count: {
        id: true,
      },
      _sum: {
        amount: true,
      },
    });

    const [minted, claimable] = await Promise.all([
      prisma.receipt.count({
        where: {
          nftOwner: req.user.walletAddress,
          nftMinted: true,
        },
      }),
      prisma.receipt.count({
        where: {
          nftOwner: req.user.walletAddress,
          nftClaimable: true,
          nftClaimed: false,
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          total: stats._count.id,
          minted,
          claimable,
          totalValue: stats._sum.amount || 0,
        },
      },
    });
  } catch (error) {
    logger.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get stats',
    });
  }
});

/**
 * GET /api/nfts/health
 * Check NFT service health
 */
router.get('/health', async (req, res) => {
  try {
    const health = await nftService.healthCheck();
    res.json({
      success: true,
      data: health,
    });
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Health check failed',
    });
  }
});

/**
 * POST /api/nfts/test-voucher (Development only - no auth required)
 * Create test NFT voucher for testing without database
 */
if (process.env.NODE_ENV !== 'production') {
  router.post('/test-voucher', async (req, res) => {
    try {
      const { receiptData, recipientAddress } = req.body;

      if (!receiptData || !recipientAddress) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'receiptData and recipientAddress required',
        });
      }

      // Create lazy mint voucher
      const result = await nftService.createLazyMintVoucher(receiptData, recipientAddress);

      res.json({
        success: true,
        voucher: result.voucher,
        metadata: result.metadata,
        ipfsHash: result.ipfsHash,
        ipfsUrl: result.ipfsUrl,
      });
    } catch (error) {
      logger.error('Test voucher error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message,
      });
    }
  });
}

export default router;
