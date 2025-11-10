# 🎨 Frontend Web3 Integration - Complete Guide

## ✅ What's Been Added

### 1. **Web3 Context** (`src/utils/web3Context.jsx`)
- MetaMask wallet connection management
- Network detection and switching to Polygon Amoy
- Account change handling
- Auto-reconnect on page reload

### 2. **WalletButton Component** (`src/components/WalletButton.jsx`)
- Connect/disconnect wallet
- Display connected address
- Network switching prompt
- Responsive design

### 3. **NFTClaim Component** (`src/components/NFTClaim.jsx`)
- Claim lazy-minted NFT vouchers on-chain
- Transaction tracking
- Gas estimation
- Error handling

### 4. **NFT Demo Page** (`src/components/NFTDemo.jsx`)
- Complete NFT minting flow
- Create vouchers (FREE)
- Claim on-chain (tiny gas)
- Success/error states

---

## 🚀 How to Use

### Start the Frontend

```bash
cd LS-frontend
npm install  # If you haven't already
npm run dev
```

Visit: **http://localhost:5173/nft-demo**

### Flow:

1. **Connect Wallet** 
   - Click "🦊 Connect Wallet"
   - Approve MetaMask connection
   - Auto-switch to Polygon Amoy testnet

2. **Create NFT Voucher** (FREE - no gas!)
   - Click "✨ Create Test NFT Voucher"
   - Voucher created instantly
   - Metadata uploaded to IPFS

3. **Claim NFT On-Chain** (~$0.0002 gas)
   - Click "🎉 Claim NFT On-Chain"
   - Approve transaction in MetaMask
   - NFT minted to your wallet!

---

## 📁 New Files Created

```
LS-frontend/
├── src/
│   ├── utils/
│   │   └── web3Context.jsx          # Web3 wallet management
│   ├── components/
│   │   ├── WalletButton.jsx         # Wallet connect UI
│   │   ├── WalletButton.css
│   │   ├── NFTClaim.jsx             # NFT claiming UI
│   │   ├── NFTClaim.css
│   │   ├── NFTDemo.jsx              # Complete demo page
│   │   └── NFTDemo.css
│   └── App.jsx                      # Updated with Web3Provider
└── .env                              # Contract address & API URL
```

---

## 🔧 Environment Variables

Your `.env` file:

```env
VITE_API_URL=http://localhost:4000
VITE_NFT_CONTRACT_ADDRESS=0xD9b0d2510f73da0FDc2f00Ec9FCB970e1A355a83
VITE_CHAIN_ID=80002
```

---

## 🎯 Integration with Your App

### Add Wallet Button to Navbar

```jsx
import WalletButton from './components/WalletButton';

<nav>
  {/* Your existing nav items */}
  <WalletButton />
</nav>
```

### Use Web3 in Any Component

```jsx
import { useWeb3 } from './utils/web3Context';

function MyComponent() {
  const { account, isConnected, signer } = useWeb3();
  
  if (!isConnected) {
    return <p>Please connect wallet</p>;
  }
  
  return <p>Connected: {account}</p>;
}
```

### Claim NFT from Receipt

```jsx
import NFTClaim from './components/NFTClaim';

function ReceiptPage({ receipt }) {
  const voucher = {
    tokenId: receipt.nftTokenId,
    uri: receipt.nftMetadataUrl,
    recipient: receipt.nftOwner,
    receiptId: receipt.id,
    nonce: receipt.nftVoucherNonce,
    signature: receipt.nftVoucherSig,
  };

  return (
    <NFTClaim 
      voucher={voucher}
      onSuccess={(result) => {
        console.log('NFT claimed!', result);
        // Update your UI
      }}
    />
  );
}
```

---

## 🌐 Network Configuration

**Polygon Amoy Testnet:**
- Chain ID: `80002`
- RPC: `https://rpc-amoy.polygon.technology`
- Explorer: `https://amoy.polygonscan.com`
- Faucet: `https://faucet.polygon.technology`

The app will auto-prompt users to switch networks if needed.

---

## 💡 Key Features

### ✅ **Auto Network Switching**
If user is on wrong network, app shows "Switch to Polygon Amoy" button.

### ✅ **Account Change Detection**
Automatically updates when user switches accounts in MetaMask.

### ✅ **Error Handling**
- User rejected transaction
- Insufficient gas
- Wrong network
- MetaMask not installed

### ✅ **Transaction Tracking**
Shows Polygonscan link while transaction processes.

### ✅ **Responsive Design**
Works on mobile and desktop.

---

## 🎨 Customization

### Change Colors

Edit the CSS files to match your brand:

```css
/* WalletButton.css */
.wallet-button {
  background: linear-gradient(135deg, #YOUR_COLOR 0%, #YOUR_COLOR_2 100%);
}
```

### Add More Networks

Edit `web3Context.jsx`:

```javascript
const NETWORKS = {
  polygonAmoy: { chainId: 80002, ... },
  ethereumSepolia: { chainId: 11155111, ... },
  // Add more...
};
```

---

## 🧪 Testing

1. **Get Test Tokens**: https://faucet.polygon.technology
2. **Visit Demo**: http://localhost:5173/nft-demo
3. **Create Voucher**: FREE (no wallet needed)
4. **Claim NFT**: ~$0.0002 (requires POL)

---

## 📊 Cost Breakdown

| Action | Gas Cost | USD Equivalent |
|--------|----------|----------------|
| Create Voucher | 0 ETH | $0.00 (off-chain) |
| Claim NFT | ~0.001 POL | ~$0.0002 |
| 100 NFTs | ~0.1 POL | ~$0.02 |
| 1000 NFTs | ~1 POL | ~$0.20 |

Compare to Ethereum: **$1-5 per NFT** 😱

---

## 🐛 Troubleshooting

### "Please install MetaMask"
→ Install from https://metamask.io

### "Wrong network"
→ Click "Switch to Polygon Amoy" button

### "Insufficient funds"
→ Get free POL from https://faucet.polygon.technology

### Transaction stuck
→ Check Polygonscan: https://amoy.polygonscan.com

---

## 🎉 Success!

You now have a complete Web3 NFT minting system with:

✅ Wallet connection (MetaMask)  
✅ Network management (Polygon Amoy)  
✅ NFT voucher creation (FREE)  
✅ On-chain claiming (ultra-low cost)  
✅ Transaction tracking  
✅ Error handling  
✅ Responsive UI  

**Next Steps:**
- Integrate NFTClaim into your existing receipt pages
- Add WalletButton to your navbar
- Customize the UI to match your brand
- Test with real users!

---

## 📚 Resources

- [ethers.js Docs](https://docs.ethers.org/v6/)
- [Polygon Amoy Testnet](https://docs.polygon.technology/tools/faucets/amoy/)
- [MetaMask Docs](https://docs.metamask.io/)
- [OpenSea Testnet](https://testnets.opensea.io/)

---

**Questions?** Check the code comments - they're detailed! 🚀
