# Production Deployment Guide

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
```bash
cp .env.example .env
# Edit .env with your actual values
```

### 3. Compile Smart Contracts
```bash
npm run compile
```

### 4. Deploy to Polygon zkEVM Testnet
```bash
npm run deploy:testnet
```

This will:
- Deploy LiquidSplitNFT contract to Polygon zkEVM Cardona testnet
- Save deployment info to `deployments/polygonZkEVMTestnet-deployment.json`
- Display contract address to add to .env

### 5. Update .env with Contract Address
```bash
# Add the deployed contract address
NFT_CONTRACT_ADDRESS="0x..."
```

### 6. Run Database Migration
```bash
npm run migrate
```

### 7. Start Production Server
```bash
npm start
```

---

## 📋 Pre-Deployment Checklist

### Security
- [ ] Change all JWT secrets in .env
- [ ] Use strong database password
- [ ] Never commit .env file
- [ ] Set NODE_ENV=production
- [ ] Configure CORS_ORIGIN to your frontend domain
- [ ] Enable HTTPS in production
- [ ] Review and adjust rate limits

### Smart Contract
- [ ] Audit smart contract code
- [ ] Test on testnet thoroughly
- [ ] Get contract address and update .env
- [ ] Verify contract on block explorer
- [ ] Grant MINTER_ROLE to backend wallet
- [ ] Fund deployer wallet with testnet ETH

### Database
- [ ] Database backed up
- [ ] Connection pooling configured
- [ ] Migrations applied
- [ ] Indexes optimized

### Testing
- [ ] All unit tests pass: `npm run test:contracts`
- [ ] All API tests pass: `npm run test:api`
- [ ] Load testing completed
- [ ] Security scanning done

---

## 🔐 Security Configuration

### 1. Generate Strong Secrets
```bash
# JWT Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# JWT Refresh Secret  
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2. Wallet Security
- **NEVER** commit private keys
- Use hardware wallet for production
- Use separate wallets for testnet and mainnet
- Implement multi-sig for contract admin operations

### 3. API Security
- Rate limiting configured (100 req/15min globally)
- Helmet security headers enabled
- CORS restricted to frontend domain
- Input validation on all endpoints
- SQL injection prevention via Prisma
- XSS protection

---

## 🧪 Testing

### Run All Tests
```bash
npm run test:all
```

### Run Contract Tests Only
```bash
npm run test:contracts
```

### Run API Tests Only
```bash
npm run test:api
```

### Test Coverage
```bash
npx hardhat coverage
```

---

## 💰 Cost Optimization: Lazy Minting

### How It Works
1. **Create Voucher (FREE)**: Generate signed voucher off-chain
2. **User Claims (User Pays)**: User decides when to mint on-chain
3. **Batch Operations**: Mint multiple NFTs in one transaction

### Estimated Costs on Polygon zkEVM
- Single Mint: ~$0.0001 - $0.001
- Batch Mint (10): ~$0.0005 - $0.005
- Lazy Mint Claim: ~$0.0002 - $0.002

**Result**: Near-zero costs for production use!

---

## 📊 Monitoring & Logging

### Logs Location
- Error logs: `logs/error.log`
- Combined logs: `logs/combined.log`
- Security logs: `logs/security.log`
- Exceptions: `logs/exceptions.log`

### Log Levels
- `debug`: Detailed debugging info
- `info`: General information
- `warn`: Warning messages
- `error`: Error messages

### Set Log Level
```bash
LOG_LEVEL=info npm start
```

---

## 🔄 Database Migrations

### Create Migration
```bash
npm run migrate
```

### Reset Database (DANGER!)
```bash
npx prisma migrate reset --schema src/prisma/schema.prisma
```

### Generate Prisma Client
```bash
npm run generate
```

---

## 🌐 Deployment Platforms

### Recommended: Railway
1. Connect GitHub repo
2. Add environment variables
3. Deploy automatically on push

### Alternative: Heroku
```bash
heroku create your-app-name
heroku addons:create heroku-postgresql:hobby-dev
heroku config:set NODE_ENV=production
git push heroku main
```

### Alternative: AWS/DigitalOcean
- Use PM2 for process management
- Set up Nginx reverse proxy
- Configure SSL with Let's Encrypt
- Use managed PostgreSQL database

---

## 🐛 Troubleshooting

### Contract Deployment Fails
- Check wallet has testnet ETH
- Verify RPC URL is correct
- Check network connectivity
- Try different RPC endpoint

### Database Connection Issues
- Verify DATABASE_URL format
- Check database is accessible
- Ensure IP is whitelisted (cloud databases)
- Test connection: `npx prisma db pull`

### NFT Minting Fails
- Ensure contract is deployed
- Check NFT_CONTRACT_ADDRESS in .env
- Verify wallet has MINTER_ROLE
- Check gas price not too low

### Authentication Errors
- Verify JWT secrets are set
- Check token expiration times
- Ensure clocks are synchronized
- Review CORS configuration

---

## 📈 Performance Optimization

### Database
- Use connection pooling
- Add indexes on frequently queried fields
- Enable query logging to find slow queries
- Use database caching (Redis)

### API
- Implement response caching
- Use CDN for static assets
- Enable gzip compression
- Optimize query complexity

### Blockchain
- Batch operations when possible
- Use lazy minting for cost savings
- Cache blockchain data
- Implement event listeners for real-time updates

---

## 🔒 Production Best Practices

1. **Never log sensitive data** (passwords, private keys)
2. **Use environment variables** for all secrets
3. **Implement proper error handling** (don't expose stack traces)
4. **Set up monitoring** (Sentry, DataDog, etc.)
5. **Regular security audits** of smart contracts
6. **Backup database** regularly
7. **Use HTTPS** in production
8. **Implement rate limiting** aggressively
9. **Validate all inputs** on server side
10. **Keep dependencies updated**

---

## 📞 Support

For issues or questions:
1. Check logs in `logs/` directory
2. Review error messages carefully
3. Consult Hardhat/Prisma documentation
4. Test on testnet first
5. Use blockchain explorers for transaction debugging

---

## 🎯 Next Steps

1. ✅ Deploy smart contract
2. ✅ Update .env with contract address
3. ✅ Run database migrations
4. ✅ Test all endpoints
5. ✅ Deploy to production
6. ✅ Monitor logs and performance
7. ✅ Set up CI/CD pipeline
8. ✅ Implement monitoring alerts
9. ✅ Document API endpoints
10. ✅ Train team on security practices
