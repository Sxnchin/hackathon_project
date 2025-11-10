# 🚀 Quick Reference Guide

## Essential Commands

### Development
```bash
npm run dev              # Start with auto-reload
npm start                # Production server
npm run test:all         # Run all tests
```

### Blockchain
```bash
npm run compile          # Compile contracts
npm run deploy:testnet   # Deploy to zkEVM testnet
npm run deploy:mainnet   # Deploy to zkEVM mainnet (production)
```

### Database
```bash
npm run migrate          # Run migrations
npm run generate         # Generate Prisma client
npx prisma studio        # Open database GUI
```

---

## Environment Variables (Must Set)

```bash
# Database
DATABASE_URL="postgresql://..."

# Security (GENERATE NEW!)
JWT_SECRET="<64-char-hex>"
JWT_REFRESH_SECRET="<64-char-hex>"

# Blockchain
NFT_CONTRACT_ADDRESS="0x..."
PRIVATE_KEY="<no-0x-prefix>"
POLYGON_ZKEVM_RPC="https://rpc.cardona.zkevm-rpc.com"

# IPFS
PINATA_API_KEY="..."
PINATA_SECRET_KEY="..."
```

### Generate Secrets
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## API Endpoints

### Authentication
```http
POST   /api/auth/register      # Create account
POST   /api/auth/login         # Login
POST   /api/auth/refresh       # Refresh token
POST   /api/auth/logout        # Logout
GET    /api/auth/me            # Get profile
PATCH  /api/auth/wallet        # Link wallet
```

### NFTs
```http
POST   /api/nfts/create-voucher         # Create lazy mint (FREE)
POST   /api/nfts/claim                   # Claim on-chain
POST   /api/nfts/batch-create-vouchers  # Batch (admin)
GET    /api/nfts/receipt/:id            # Get NFT data
GET    /api/nfts/my-nfts                # User's NFTs
GET    /api/nfts/stats                  # Statistics
GET    /api/nfts/health                 # Service health
```

---

## Request Examples

### Register User
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123!",
    "walletAddress": "0x742d35Cc6443f5C74A5F6e9b8e8f1F1F4545D5A5"
  }'
```

### Login
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

### Create NFT Voucher
```bash
curl -X POST http://localhost:4000/api/nfts/create-voucher \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "receiptId": 1,
    "recipientAddress": "0x742d35Cc6443f5C74A5F6e9b8e8f1F1F4545D5A5"
  }'
```

### Get My NFTs
```bash
curl http://localhost:4000/api/nfts/my-nfts \
  -H "Authorization: Bearer <access_token>"
```

---

## User Roles

| Role | Permissions |
|------|-------------|
| **USER** | Standard user - can create/claim NFTs for own receipts |
| **MODERATOR** | Can manage pots and receipts |
| **ADMIN** | Full access - can batch mint, manage users, access all resources |

---

## Error Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 400 | Bad Request | Invalid input, validation failed |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error, check logs |

---

## Security Checklist

### Before Production
- [ ] Change all JWT secrets
- [ ] Use hardware wallet for mainnet
- [ ] Enable HTTPS
- [ ] Set CORS to frontend domain only
- [ ] Review rate limits
- [ ] Audit contract (if deploying to mainnet)
- [ ] Test on testnet first
- [ ] Set NODE_ENV=production
- [ ] Configure database backups
- [ ] Set up monitoring/alerts

---

## Troubleshooting

### "Invalid token"
- Token expired (15min lifetime)
- Use refresh token endpoint
- Login again

### "Database connection failed"
- Check DATABASE_URL in .env
- Ensure database is accessible
- Check IP whitelist (cloud DBs)

### "Contract deployment failed"
- Need testnet ETH for gas
- Check RPC URL
- Verify private key format (no 0x)

### "IPFS upload failed"
- Verify Pinata API keys
- Check network connection
- Check Pinata account limits

---

## Gas Costs (Polygon zkEVM)

| Operation | Cost (USD) |
|-----------|-----------|
| Deploy Contract | ~$0.01 |
| Standard Mint | ~$0.0001 |
| Batch Mint (10) | ~$0.0005 |
| Lazy Claim | ~$0.0002 |
| Transfer | ~$0.0001 |

**Total to mint 1000 NFTs**: ~$0.10 - $0.20 🎉

---

## Logs

### View Logs
```bash
# Error logs only
cat logs/error.log

# All logs
cat logs/combined.log

# Security events
cat logs/security.log

# Live tail
tail -f logs/combined.log
```

### Log Levels
- `debug`: Detailed debugging
- `info`: General information (default)
- `warn`: Warnings
- `error`: Errors only

---

## Database

### Common Queries
```bash
# Open Prisma Studio
npx prisma studio

# View current schema
npx prisma db pull --schema src/prisma/schema.prisma

# Reset database (DANGER!)
npx prisma migrate reset --schema src/prisma/schema.prisma
```

---

## Testing

### Quick Test
```bash
# Test contract deployment
npm run test:contracts

# Test API endpoints
npm run test:api

# Everything
npm run test:all
```

### Test Coverage
```bash
npx hardhat coverage
```

---

## Performance

### Rate Limits
- Global: 100 req / 15min
- Auth: 10 req / 15min
- Register: 5 / hour
- Login: 5 / 15min
- Minting: 50 / hour per user

### Optimization Tips
- Use batch operations when possible
- Implement caching for frequently accessed data
- Use lazy minting to reduce costs
- Monitor database query performance

---

## Support

### Getting Help
1. Check logs in `logs/` directory
2. Review error messages
3. Check `DEPLOYMENT.md` for detailed guide
4. Verify environment variables
5. Test on testnet first

### Useful Resources
- Hardhat Docs: https://hardhat.org/docs
- Prisma Docs: https://www.prisma.io/docs
- Polygon zkEVM: https://docs.polygon.technology/zkEVM/
- OpenZeppelin: https://docs.openzeppelin.com/contracts/

---

## Quick Wins

### Free NFT Creation
```javascript
// 1. Create voucher (off-chain, FREE)
POST /api/nfts/create-voucher

// 2. User claims later (on-chain, ~$0.0002)
POST /api/nfts/claim
```

### Batch Operations
```javascript
// Instead of 100 individual mints
// Use 1 batch mint = 90%+ gas savings
POST /api/nfts/batch-create-vouchers
```

### Cost Comparison
| Method | 100 NFTs | 1000 NFTs |
|--------|----------|-----------|
| Traditional (Ethereum) | $50-$200 | $500-$2000 |
| **Lazy Mint (zkEVM)** | **$0.02** | **$0.20** |
| **Savings** | **99.9%** | **99.99%** |

---

**💡 Pro Tip**: Always test on testnet before mainnet. Get free testnet ETH from Polygon faucets!
