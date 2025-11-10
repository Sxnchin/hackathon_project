# Get Free Testnet Tokens for Deployment

## Your Wallet Address
```
0xa32146B9D024C063BB4cDC06C25A08addeEB5ae9
```

## Option 1: Polygon zkEVM Cardona Faucet (Recommended)

### Using Alchemy Faucet
1. Visit: https://www.alchemy.com/faucets/polygon-zkevm-cardona
2. Enter your wallet address: `0xa32146B9D024C063BB4cDC06C25A08addeEB5ae9`
3. Complete any captcha/verification
4. Receive **0.1-0.5 testnet ETH** (enough for thousands of NFT mints!)

### Using QuickNode Faucet
1. Visit: https://faucet.quicknode.com/polygon/zkevm-testnet
2. Enter your wallet address: `0xa32146B9D024C063BB4cDC06C25A08addeEB5ae9`
3. Complete social verification (follow on Twitter, etc.)
4. Receive testnet ETH

### Using Polygon Official Faucet
1. Visit: https://faucet.polygon.technology
2. Select "zkEVM Cardona Testnet"
3. Enter your wallet address
4. Complete verification
5. Receive tokens

## Option 2: Alternative Faucets

### ChainLink Faucet
1. Visit: https://faucets.chain.link/polygon-zkevm-cardona
2. Connect wallet or enter address
3. Get free testnet ETH

### LearnWeb3 Faucet
1. Visit: https://learnweb3.io/faucets/polygon_zkevm_cardona
2. Enter address
3. Receive tokens

## How Much Do You Need?

For deployment: **0.01-0.05 ETH** is more than enough

Why? On Polygon zkEVM:
- Contract deployment: ~0.001-0.005 ETH
- 1 NFT mint: ~0.0002 ETH
- 100 NFT mints: ~0.02 ETH

So **0.1 ETH from any faucet** will let you:
- Deploy the contract
- Mint 400+ NFTs
- Test everything extensively

## After Getting Tokens

Check your balance:
```powershell
cd "c:\Users\sanch\VSC Projects\hackathon_project\liquid-split-app\Ls-backend"
node -e "const ethers = require('ethers'); const provider = new ethers.providers.JsonRpcProvider('https://rpc.cardona.zkevm-rpc.com'); provider.getBalance('0xa32146B9D024C063BB4cDC06C25A08addeEB5ae9').then(b => console.log('Balance:', ethers.utils.formatEther(b), 'ETH'));"
```

Then deploy:
```powershell
npm run deploy:testnet
```

## Troubleshooting

**Faucet says "Rate limited"?**
- Try a different faucet from the list
- Wait 24 hours and try again
- Use a different browser/IP

**Still can't get tokens?**
- Join Polygon Discord: https://discord.gg/polygon
- Ask in #faucet-requests channel
- Community members often help out!

**Need mainnet tokens later?**
- For production, you'll need real ETH on Polygon zkEVM mainnet
- But it's incredibly cheap: deploying + 1000 NFTs = ~$0.50 total!
