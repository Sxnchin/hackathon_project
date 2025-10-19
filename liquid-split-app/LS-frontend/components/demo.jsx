import React, { useState, useEffect } from 'react';
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

// --- SVG Icons ---
const CheckIcon = () => (
  <svg
    className="w-6 h-6"
    style={{ color: 'var(--success-color)' }}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M5 13l4 4L19 7"
    />
  </svg>
);

const SpinnerIcon = () => (
  <svg
    className="animate-spin h-5 w-5 text-white"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    ></path>
  </svg>
);

const SuccessIcon = () => (
  <motion.svg
    initial={{ scale: 0, rotate: -90 }}
    animate={{ scale: 1, rotate: 0 }}
    transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
    className="w-20 h-20 text-green-500"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </motion.svg>
);
// moved into component body to avoid invalid Hook call

// --- Mock Server ---
const mockSocketServer = {
  listeners: {},
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  },
  emit(event, data) {
    switch (event) {
      case 'start-split':
        this.handleStartSplit();
        break;
      case 'user-paid':
        this.handleUserPaid(data.userId);
        break;
      default:
        break;
    }
  },
  broadcast(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => callback(data));
    }
  },
  state: { totalAmount: 300, participants: [] },
  handleStartSplit() {
    this.state.participants = [
      { id: 1, name: 'You', share: 100, status: 'pending' },
      { id: 2, name: 'Alex', share: 100, status: 'pending' },
      { id: 3, name: 'Jordan', share: 100, status: 'pending' },
    ];
    this.broadcast('update-split-status', this.state);
  },
  handleUserPaid(userId) {
    const user = this.state.participants.find((p) => p.id === userId);
    if (user && user.status === 'pending') {
      user.status = 'paid';
      this.broadcast('update-split-status', { ...this.state });

      const allPaid = this.state.participants.every((p) => p.status === 'paid');
      if (allPaid) {
        setTimeout(() => {
          const n = this.state.participants.length;
          const ownership = n > 0 ? (100 / n).toFixed(2) + '%' : '100%';
          const receipts = this.state.participants.map((p) => ({
            owner: p.name,
            value: p.share,
            ownership,
            nftId: `0x${Math.random().toString(16).substr(2, 8).toUpperCase()}`
          }));
          this.broadcast('split-complete', { receipts });
        }, 1000);
      }
    }
  }
};

// --- React Component ---
function Demo() {
  // Seeded users
  const seededUsers = [
    { id: 1, name: "Sanchin", email: "sanchin@example.com" },
    { id: 2, name: "Chris", email: "chris@example.com" },
    { id: 3, name: "Shaunak", email: "shaunak@example.com" }
  ];
  // Participants state (before split starts)
  const [participants, setParticipants] = useState([]);
  const [splitState, setSplitState] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [isSplitting, setIsSplitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Helper to recalculate shares
  const recalcShares = (arr) => {
    const n = arr.length;
    if (n === 0) return [];
    const base = Math.floor((300 / n) * 100) / 100;
    let remainder = Math.round((300 - base * n) * 100) / 100;
    // Distribute any rounding error to the first participant(s)
    return arr.map((p, i) => ({
      ...p,
      share: i === 0 ? base + remainder : base
    }));
  };

  // Add member before split starts
  const handleAddMember = () => {
    const available = seededUsers.filter(u => !participants.some(p => p.id === u.id));
    if (available.length === 0) return alert("All members added!");
    const name = prompt("Add member (choose: " + available.map(u => u.name).join(", ") + "):");
    const user = available.find(u => u.name.toLowerCase() === name?.trim().toLowerCase());
    if (user) {
      const updated = recalcShares([...participants, user]);
      setParticipants(updated);
    } else if (name) {
      alert("User not found or already added.");
    }
  };

  // Remove member before split starts
  const handleRemoveMember = (id) => {
    const updated = recalcShares(participants.filter(p => p.id !== id));
    setParticipants(updated);
  };

  useEffect(() => {
    if (isSplitting) {
      // Register listeners first
      mockSocketServer.on('update-split-status', (newState) => setSplitState(newState));
      mockSocketServer.on('split-complete', (data) => {
        setIsComplete(true);
        setTimeout(() => {
          setReceipts(data.receipts);
        }, 2000);
      });

      // Broadcast current mock server state after listeners are registered
      mockSocketServer.broadcast('update-split-status', { totalAmount: 300, participants: mockSocketServer.state.participants });

      return () => {
        mockSocketServer.listeners = {};
      };
    }
  }, [isSplitting]);

  const handleStartSplit = () => {
    // Use selected participants for the split
    mockSocketServer.state.participants = participants.map((p) => ({ ...p, status: 'pending' }));
    // Set splitting flag which will register listeners and then broadcast
    setIsSplitting(true);
  };

  // Stripe actions (demo)
  const [log, setLog] = useState([]);
  const appendLog = (msg) => setLog((l) => [msg, ...l].slice(0, 10));

  const handleOnboard = async (userId = 1) => {
    appendLog('Requesting onboard link...');
    try {
      const res = await fetch('http://localhost:4000/stripe/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Onboard failed');
      appendLog(`Onboard URL: ${data.url}`);
      window.open(data.url, '_blank');
    } catch (err) {
      appendLog(`Onboard error: ${err.message}`);
    }
  };

  const handleCreateCharge = async () => {
    appendLog('Creating split charge...');
    try {
      const res = await fetch('http://localhost:4000/stripe/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ potId: 1, amount: 300, description: 'Demo split', payerUserIds: [1,2,3] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Charge failed');
      appendLog(`Created ${data.paymentIntents.length} PaymentIntents`);
      appendLog(JSON.stringify(data.paymentIntents));
    } catch (err) {
      appendLog(`Charge error: ${err.message}`);
    }
  };

  const handleCheckAccount = async (userId = 1) => {
    appendLog('Checking account...');
    try {
      const res = await fetch(`http://localhost:4000/stripe/account/${userId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch account');
      appendLog(`Account: ${data.stripeAccountId || 'not created'}`);
    } catch (err) {
      appendLog(`Check account error: ${err.message}`);
    }
  };

  const handlePay = (userId) => {
    if (!splitState || !splitState.participants) return;
    const user = splitState.participants.find((p) => p.id === userId);
    if (user && user.status === 'pending') {
      const newParticipants = splitState.participants.map((p) =>
        p.id === userId ? { ...p, status: 'paying' } : p
      );
      setSplitState({ ...splitState, participants: newParticipants });
      // Simulate network delay before confirming payment.
      setTimeout(() => {
        // Calculate dynamic ownership
        const n = splitState.participants.length;
        mockSocketServer.emit('user-paid', { userId, ownership: n > 0 ? (100 / n).toFixed(2) + '%' : '100%' });
      }, 1500);
    }
  };
    
  const liveParticipants = isSplitting ? (splitState?.participants ?? []) : participants;
  const paidCount = isSplitting ? liveParticipants.filter(p => p.status === 'paid').length || 0 : 0;
  const totalCount = liveParticipants.length || 0;
  const progress = totalCount > 0 ? (paidCount / totalCount) * 100 : 0;

  let actionContent;
  if (!isSplitting) {
    actionContent = (
      <>
        <button onClick={handleStartSplit} className="start-split-btn-modern" style={{marginTop: '1rem'}}>
          Start Split Purchase
        </button>
      </>
    );
  } else if (isSplitting && !isComplete) {
    actionContent = (
      <div className="text-center w-full">
        <h3 className="text-xl font-semibold text-gray-700">
          Awaiting Payments...
        </h3>
        <p className="text-gray-500 mt-2">
          {paidCount} of {totalCount} participants have paid.
        </p>
        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: `${progress}%` }}></div>
        </div>
      </div>
    );
  } else if (isComplete && receipts.length === 0) {
    actionContent = (
      <div className="text-center w-full">
        <SuccessIcon />
        <h3 className="text-2xl font-semibold text-green-600 mt-4">
          Payment Successful!
        </h3>
        <p className="text-gray-500 mt-2">Generating receipts...</p>
      </div>
    );
  } else if (receipts.length > 0) {
    actionContent = (
      <div className="w-full">
        <h3 className="text-2xl font-semibold text-green-600 text-center mb-4">
          Split Complete!
        </h3>
        <div className="space-y-3">
          {receipts.map((receipt, index) => (
            <div
              key={index}
              className="receipt-card-modern"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <p className="font-bold text-gray-800">
                {receipt.owner}'s Digital Receipt
              </p>
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>Value: ${receipt.value.toFixed(2)}</span>
                <span>Ownership: {receipt.ownership}</span>
              </div>
              <p className="text-xs text-indigo-500 mt-2 font-mono">
                NFT ID: {receipt.nftId}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

    return (
        <div className="demo-page-container">
            <motion.div className="demo-card-modern" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
                <div className="demo-header">
                    <h2 className="text-3xl font-bold text-gray-800">LiquidSplit Demo</h2>
                    <p className="text-gray-500 mt-2">Mock Checkout: Real-time splitting of a $300 TV purchase.</p>
                </div>
                <div className="demo-content-grid">
                    <div className="checkout-panel">
                        <div className="item-row">
                              <h3 className="text-xl font-semibold">Smart 4K TV</h3>
                              <p className="text-2xl font-bold text-gray-800">$300.00</p>
                        </div>
                        <div className="participants-section" style={{position: 'relative'}}>
                            <h4 style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                              <span>Participants</span>
                              {!isSplitting && (
                                <button onClick={handleAddMember} className="add-people action-btn-modern" style={{marginLeft: 'auto', marginRight: 0}}>Add Members to Group</button>
                              )}
                            </h4>
                            <div className="space-y-3">
                              {liveParticipants.map((user) => (
                                <div key={user.id} className="participant-row-modern" style={{position: 'relative'}}>
                                  <span className="font-medium text-gray-700">{user.name}</span>
                                  <span className="text-gray-600 font-semibold">${user.share.toFixed(2)}</span>
                                  {!isSplitting && (
                                    <button
                                      className="remove-member-btn"
                                      style={{position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#a1a1aa', fontSize: '1.5rem', cursor: 'pointer'}}
                                      title="Remove"
                                      onClick={() => handleRemoveMember(user.id)}
                                    >
                                      &times;
                                    </button>
                                  )}
                                  {isSplitting && user.status === 'pending' && ( <button onClick={() => handlePay(user.id)} className="pay-btn-modern">Pay</button> )}
                                  {isSplitting && user.status === 'paying' && ( <button disabled className="pay-btn-modern processing flex items-center justify-center"><SpinnerIcon /></button> )}
                                  {isSplitting && user.status === 'paid' && <CheckIcon />}
                                </div>
                              ))}
                            </div>
                        </div>
                    </div>
                    
                    <div className="action-panel-modern">
                        {actionContent}
                        {isSplitting && !isComplete && (
                          <div className="mt-4 action-btn-group-modern">
                            <button onClick={() => handleOnboard(1)} className="action-btn-modern" title="Opens Stripe Connect onboarding for demo user">Connect Stripe</button>
                            {/*
                            <button 
                              onClick={() => handleCheckAccount(1)} 
                              className="action-btn-modern"
                              title="Checks if your Stripe account is connected and ready to receive payouts."
                            >
                              Check Account
                            </button>
                            <button onClick={handleCreateCharge} className="action-btn-modern">Authorize Transaction</button>
                            */}
                          </div>
                        )}
                    </div>
                </div>
            </motion.div>
            <Link to="/" className="back-link-modern">&larr; Back to Home</Link>
        </div>
    );
}

export default Demo;