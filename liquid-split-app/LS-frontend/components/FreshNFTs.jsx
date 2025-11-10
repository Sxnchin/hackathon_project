import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import WalletButton from '../src/components/WalletButton';
import ReceiptNFTMint from './ReceiptNFTMint';
import './FreshNFTs.css';

/**
 * Fresh NFT Component - Modern, Clean UI for NFT Receipts
 */
const FreshNFTs = () => {
  const { potId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [potId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:4000/pots/${potId}/receipts`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else {
        throw new Error('Failed to load receipts');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAddress = (address) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (loading) {
    return (
      <div className="fresh-nfts">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading NFT collection...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fresh-nfts">
        <div className="error">
          <h3>❌ Error</h3>
          <p>{error}</p>
          <button onClick={fetchData}>Try Again</button>
        </div>
      </div>
    );
  }

  const { pot, receipts, stats } = data;

  return (
    <div className="fresh-nfts">
      {/* Header */}
      <div className="nft-header">
        <div className="header-content">
          <Link to="/pots" className="back-link">← Back to Pots</Link>
          <h1>🎨 {pot.name} - NFT Collection</h1>
          <p>Transform your receipts into blockchain-verified NFTs</p>
        </div>
        <div className="header-wallet">
          <WalletButton />
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="stats-dashboard">
        <div className="stat-card">
          <div className="stat-number">{stats.totalNFTs}</div>
          <div className="stat-label">NFTs Minted</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{receipts.length}</div>
          <div className="stat-label">Total Receipts</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">${stats.totalValue.toFixed(2)}</div>
          <div className="stat-label">NFT Value</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.percentMinted}%</div>
          <div className="stat-label">Minted</div>
        </div>
      </div>

      {/* Receipts Grid */}
      <div className="receipts-section">
        <h2>💰 Receipts</h2>
        
        {receipts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No receipts yet</h3>
            <p>Receipts will appear here when pot members make contributions.</p>
          </div>
        ) : (
          <div className="receipts-grid">
            {receipts.map((receipt) => (
              <div key={receipt.id} className={`receipt-card ${receipt.nftMinted ? 'has-nft' : ''}`}>
                
                {/* Receipt Header */}
                <div className="receipt-header">
                  <h3>Receipt #{receipt.id}</h3>
                  <div className="receipt-amount">${receipt.amount}</div>
                </div>

                {/* Receipt Details */}
                <div className="receipt-details">
                  <p><strong>Payer:</strong> {receipt.payer.name}</p>
                  <p><strong>Date:</strong> {formatDate(receipt.timestamp)}</p>
                  {receipt.description && (
                    <p><strong>Note:</strong> {receipt.description}</p>
                  )}
                </div>

                {/* NFT Section */}
                <ReceiptNFTMint 
                  receipt={receipt} 
                  potId={potId} 
                  onSuccess={fetchData} 
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="info-section">
        <h3>🔍 About NFT Receipts</h3>
        <div className="info-grid">
          <div className="info-card">
            <h4>🎨 What are NFT Receipts?</h4>
            <p>NFT receipts are blockchain-verified proof of your payments and ownership shares. Each NFT contains your receipt data permanently stored on IPFS.</p>
          </div>
          <div className="info-card">
            <h4>🔒 Why mint an NFT?</h4>
            <p>NFTs provide immutable proof of ownership that can't be disputed, lost, or altered. Perfect for legal documentation and resale value.</p>
          </div>
          <div className="info-card">
            <h4>💡 How it works</h4>
            <p>Your receipt metadata is uploaded to IPFS, then an NFT is created linking to that data. You own the NFT in your wallet forever.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FreshNFTs;