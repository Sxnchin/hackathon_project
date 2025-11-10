/**
 * NFT Demo Page
 * Demonstrates creating and claiming NFTs
 */

import { useState } from 'react';
import WalletButton from './WalletButton';
import NFTClaim from './NFTClaim';
import { useWeb3 } from '../utils/web3Context';
import './NFTDemo.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function NFTDemo() {
  const { account, isConnected } = useWeb3();
  const [voucher, setVoucher] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [claimSuccess, setClaimSuccess] = useState(null);

  // Create test NFT voucher
  const createTestVoucher = async () => {
    if (!account) {
      setCreateError('Please connect your wallet first');
      return;
    }

    try {
      setIsCreating(true);
      setCreateError(null);
      setVoucher(null);

      const testReceipt = {
        id: Date.now(),
        merchantName: "Starbucks",
        amount: 15.50,
        currency: "USD",
        purchaseDate: new Date().toISOString(),
        potId: 1,
        imageUrl: "https://via.placeholder.com/500?text=Starbucks+Receipt"
      };

      console.log('🎯 Creating NFT voucher...');

      const response = await fetch(`${API_URL}/api/nft/test-voucher`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiptData: testReceipt,
          recipientAddress: account,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create voucher: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to create voucher');
      }

      console.log('✅ Voucher created:', data);
      setVoucher(data.voucher);
    } catch (err) {
      console.error('Create voucher error:', err);
      setCreateError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClaimSuccess = (result) => {
    setClaimSuccess(result);
    console.log('🎉 NFT claimed successfully:', result);
  };

  const handleClaimError = (error) => {
    console.error('Claim failed:', error);
  };

  return (
    <div className="nft-demo-page">
      <div className="demo-header">
        <h1>🎨 NFT Minting Demo</h1>
        <WalletButton />
      </div>

      <div className="demo-content">
        {!isConnected && (
          <div className="connect-prompt">
            <h2>👆 Connect Your Wallet to Get Started</h2>
            <p>You'll need MetaMask and some POL tokens on Polygon Amoy testnet</p>
            <a
              href="https://faucet.polygon.technology"
              target="_blank"
              rel="noopener noreferrer"
              className="faucet-link"
            >
              💧 Get Free POL Tokens
            </a>
          </div>
        )}

        {isConnected && !voucher && !claimSuccess && (
          <div className="create-section">
            <h2>Step 1: Create NFT Voucher (FREE)</h2>
            <p>Create a lazy-minted NFT voucher. This is completely FREE - no gas required!</p>
            
            <button
              className="create-button"
              onClick={createTestVoucher}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <span className="spinner"></span>
                  Creating Voucher...
                </>
              ) : (
                '✨ Create Test NFT Voucher'
              )}
            </button>

            {createError && (
              <div className="error-message">
                ❌ {createError}
              </div>
            )}

            <div className="info-box">
              <h4>💡 What's a Lazy Mint Voucher?</h4>
              <p>It's an off-chain signature that proves you have the right to claim an NFT.</p>
              <ul>
                <li>✅ Created instantly</li>
                <li>✅ Zero gas fees</li>
                <li>✅ Stored on IPFS</li>
                <li>✅ Can be claimed later on-chain</li>
              </ul>
            </div>
          </div>
        )}

        {voucher && !claimSuccess && (
          <div className="claim-section">
            <h2>Step 2: Claim NFT On-Chain</h2>
            <p>Now claim your NFT on the Polygon blockchain. This costs ~$0.0002 in gas.</p>
            
            <NFTClaim
              voucher={voucher}
              onSuccess={handleClaimSuccess}
              onError={handleClaimError}
            />

            <button
              className="reset-button"
              onClick={() => {
                setVoucher(null);
                setCreateError(null);
              }}
            >
              ← Create Another Voucher
            </button>
          </div>
        )}

        {claimSuccess && (
          <div className="success-section">
            <div className="success-card">
              <h2>🎉 NFT Claimed Successfully!</h2>
              
              <div className="success-details">
                <p><strong>Token ID:</strong> {claimSuccess.tokenId}</p>
                <p><strong>Block Number:</strong> {claimSuccess.blockNumber}</p>
                
                <a
                  href={`https://amoy.polygonscan.com/tx/${claimSuccess.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="explorer-link"
                >
                  🔍 View on Polygonscan
                </a>

                <a
                  href={`https://testnets.opensea.io/assets/amoy/${import.meta.env.VITE_NFT_CONTRACT_ADDRESS || '0xD9b0d2510f73da0FDc2f00Ec9FCB970e1A355a83'}/${claimSuccess.tokenId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="opensea-link"
                >
                  🌊 View on OpenSea
                </a>
              </div>

              <button
                className="create-another-button"
                onClick={() => {
                  setVoucher(null);
                  setClaimSuccess(null);
                  setCreateError(null);
                }}
              >
                ✨ Create Another NFT
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="demo-footer">
        <div className="stats-grid">
          <div className="stat-card">
            <h3>💰 Total Cost</h3>
            <p className="stat-value">$0.0002</p>
            <p className="stat-label">Per NFT claimed</p>
          </div>
          <div className="stat-card">
            <h3>⚡ Speed</h3>
            <p className="stat-value">~2 sec</p>
            <p className="stat-label">Transaction time</p>
          </div>
          <div className="stat-card">
            <h3>🌍 Network</h3>
            <p className="stat-value">Polygon</p>
            <p className="stat-label">Amoy Testnet</p>
          </div>
        </div>
      </div>
    </div>
  );
}
