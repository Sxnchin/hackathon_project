/**
 * Receipt NFT Minting Component
 * Integrates lazy minting with Web3 wallet
 */

import { useState } from 'react';
import { useWeb3 } from '../src/utils/web3Context';
import NFTClaim from '../src/components/NFTClaim';
import './ReceiptNFTMint.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function ReceiptNFTMint({ receipt, potId, onSuccess }) {
  const { account, isConnected } = useWeb3();
  const [step, setStep] = useState('idle'); // idle, creating-voucher, voucher-ready, claiming
  const [voucher, setVoucher] = useState(null);
  const [error, setError] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  // Validate receipt has required fields
  if (!receipt || !receipt.id) {
    return (
      <div className="receipt-nft-error">
        <p style={{ color: '#ef4444', fontSize: '0.875rem' }}>
          ⚠️ Invalid receipt data - cannot mint NFT
        </p>
      </div>
    );
  }

  // Check if NFT already exists
  if (receipt.nftMinted) {
    return (
      <div className="receipt-nft-minted">
        <div className="nft-badge">✨ NFT Minted</div>
        <div className="nft-info">
          <p><strong>Token ID:</strong> {receipt.nftTokenId}</p>
          <p><strong>Owner:</strong> {receipt.nftOwner?.slice(0, 6)}...{receipt.nftOwner?.slice(-4)}</p>
        </div>
        <div className="nft-links">
          {receipt.nftMetadataUrl && (
            <a href={receipt.nftMetadataUrl} target="_blank" rel="noopener noreferrer" className="nft-link">
              📄 Metadata
            </a>
          )}
          {receipt.nftOpenseaUrl && (
            <a href={receipt.nftOpenseaUrl} target="_blank" rel="noopener noreferrer" className="nft-link">
              🌊 OpenSea
            </a>
          )}
        </div>
      </div>
    );
  }

  // Check if voucher already exists but not claimed
  if (receipt.nftClaimable && !receipt.nftClaimed && receipt.nftVoucherSig) {
    const existingVoucher = {
      tokenId: receipt.nftTokenId,
      uri: receipt.nftMetadataUrl,
      recipient: receipt.nftOwner,
      receiptId: receipt.id,
      nonce: parseInt(receipt.nftVoucherNonce),
      signature: receipt.nftVoucherSig,
    };

    return (
      <div className="receipt-nft-claim">
        <h4>🎉 Voucher Ready to Claim!</h4>
        <p>Your NFT voucher has been created. Claim it on-chain to own it permanently.</p>
        <NFTClaim
          voucher={existingVoucher}
          onSuccess={(result) => {
            if (onSuccess) onSuccess(result);
          }}
          onError={(err) => setError(err)}
        />
      </div>
    );
  }

  // Create voucher (FREE, off-chain)
  const createVoucher = async () => {
    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);

      console.log('📝 Creating voucher for receipt:', {
        receiptId: receipt.id,
        receiptIdType: typeof receipt.id,
        potId,
        account,
        hasReceipt: !!receipt,
        fullReceipt: receipt
      });

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Please login first');
      }

      const response = await fetch(`${API_URL}/api/nft/create-voucher`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiptId: receipt.id,
          recipientAddress: account, // Use connected wallet
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create voucher');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to create voucher');
      }

      setVoucher(data.data.voucher);
      setStep('voucher-ready');

      console.log('✅ Voucher created:', data);
    } catch (err) {
      console.error('Create voucher error:', err);
      setError(err.message || 'Failed to create voucher');
      setStep('idle'); // Reset to allow retry
    } finally {
      setIsCreating(false);
    }
  };

  // Render based on step
  if (step === 'voucher-ready' && voucher) {
    return (
      <div className="receipt-nft-claim">
        <h4>🎉 Voucher Created!</h4>
        <p>Your NFT voucher is ready. Claim it on-chain to mint it to your wallet.</p>
        <NFTClaim
          voucher={voucher}
          onSuccess={(result) => {
            setStep('claimed');
            if (onSuccess) onSuccess(result);
          }}
          onError={(err) => setError(err)}
        />
      </div>
    );
  }

  // Default: Show create button
  return (
    <div className="receipt-nft-mint">
      {!isConnected ? (
        <div className="connect-prompt">
          <p>🦊 Connect your wallet to mint this receipt as an NFT</p>
          <p className="hint">Use the wallet button in the top right corner</p>
        </div>
      ) : (
        <>
          <div className="mint-info">
            <h4>🎨 Mint Receipt NFT</h4>
            <p>Create a permanent blockchain record of this receipt.</p>
            <ul className="benefits-list">
              <li>✅ FREE voucher creation (no gas!)</li>
              <li>✅ Stored on IPFS permanently</li>
              <li>✅ Claim anytime (~$0.0002 gas)</li>
              <li>✅ Proof of payment & ownership</li>
            </ul>
          </div>

          <button
            onClick={createVoucher}
            disabled={isCreating}
            className="create-voucher-button"
          >
            {isCreating ? (
              <>
                <span className="spinner"></span>
                Creating Voucher...
              </>
            ) : (
              '✨ Create NFT Voucher (FREE)'
            )}
          </button>

          {error && (
            <div className="error-message">
              ❌ {error}
            </div>
          )}
        </>
      )}
    </div>
  );
}
