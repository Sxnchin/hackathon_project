
import React, { useState, useEffect } from 'react';
import { useAuth } from "../src/utils/authContext";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

/* ---------- ICONS ---------- */
const CheckIcon = () => (
  <svg className="w-6 h-6" style={{ color: 'var(--success-color)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
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
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </motion.svg>
);

/* ---------- MOCK SOCKET SERVER ---------- */
const mockSocketServer = {
  listeners: {},
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
    console.debug(`[mockSocket] registered listener for ${event} (total ${this.listeners[event].length})`);
  },
  emit(event, data) {
    console.debug(`[mockSocket] emit ${event}`, data);
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
    console.debug(`[mockSocket] broadcast ${event}`, data);
    if (this.listeners[event]) this.listeners[event].forEach((cb) => cb(data));
  },
  state: { totalAmount: 300, participants: [] },
  handleStartSplit() {
    this.state.participants = [
      { id: 1, name: 'You', share: 100, status: 'pending' },
      { id: 2, name: 'Alex', share: 100, status: 'paid' },   // Already authenticated
      { id: 3, name: 'Jordan', share: 100, status: 'paid' }, // Already authenticated
    ];
    this.broadcast('update-split-status', this.state);
  },
  handleUserPaid(userId) {
    console.debug('[mockSocket] handleUserPaid', userId);
    const user = this.state.participants.find((p) => p.id === userId);
    if (user && user.status === 'pending') {
      user.status = 'paid';
      this.broadcast('update-split-status', { ...this.state });

      const allPaid = this.state.participants.every((p) => p.status === 'paid');
      if (allPaid) {
        // Always emit split-complete reliably, even if listeners were reset
        setTimeout(() => {
          const n = this.state.participants.length;
          const ownership = n > 0 ? (100 / n).toFixed(2) + '%' : '100%';
          const receipts = this.state.participants.map((p) => ({
            owner: p.name,
            value: p.share,
            ownership,
            nftId: `0x${Math.random().toString(16).substr(2, 8).toUpperCase()}`
          }));
          // Broadcast split-complete to registered listeners
          this.broadcast('split-complete', { receipts });
        }, 1000);
      }
    }
  }
};

/* ---------- DUO AUTH POPUP ---------- */
const DuoAuthPopup = ({ onApprove, onCancel, ttl = 60}) => {
  const [seconds, setSeconds] = useState(ttl);

  useEffect(() => {
    const tick = setInterval(() => setSeconds((s) => s - 1), 1000);
    const expire = setTimeout(() => onCancel(), ttl * 1000);
    return () => { clearInterval(tick); clearTimeout(expire); };
  }, [onCancel, ttl]);

  return (
    <div className="duo-overlay">
      <motion.div
        className="duo-box"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h3 className="duo-title">Collective Authentication</h3>
        <p className="duo-desc">Approve login on your device to confirm payment.</p>
        <p className="duo-timer">Expires in {seconds}s</p>
        <div className="duo-actions">
          <button className="approve-btn" onClick={onApprove}>✅ Approve</button>
          <button className="cancel-btn" onClick={onCancel}>❌ Deny</button>
        </div>
      </motion.div>
    </div>
  );
};

/* ---------- MAIN DEMO COMPONENT ---------- */
function Demo() {
  const TOTAL_AMOUNT = 300;

  // Recalculate per-user shares (dollars) for the DEMO total
  const recalcShares = (arr) => {
    const n = arr.length;
    if (n === 0) return [];
    const base = Math.floor((TOTAL_AMOUNT / n) * 100) / 100;
    const remainder = Math.round((TOTAL_AMOUNT - base * n) * 100) / 100;
    return arr.map((p, i) => ({ ...p, share: i === 0 ? Number((base + remainder).toFixed(2)) : Number(base.toFixed(2)) }));
  };

  // Add participant before split starts
  const handleAddMember = () => {
    // Only allow adding users not already in participants
    const available = seededUsers.filter(u => !participants.some(p => p.id === u.id));
    if (available.length === 0) return alert("All members added!");
    const name = prompt("Add member (choose: " + available.map(u => u.name).join(", ") + "):");
    const user = available.find(u => u.name.toLowerCase() === name?.trim().toLowerCase());
    if (user) {
      setParticipants(prev => recalcShares([...prev, { ...user, status: 'pending' }]));
    } else if (name) {
      alert("User not found or already added.");
    }
  };

  // Remove participant before split starts
  const handleRemoveMember = (id) => {
    setParticipants(prev => recalcShares(prev.filter(p => p.id !== id)));
  };
  const { user: currentUser, login } = useAuth();
  // Seeded users - will fetch from backend for demo
  const [seededUsers, setSeededUsers] = useState([]);
  // Participants state (before split starts)
  const [participants, setParticipants] = useState([]);
  const [splitState, setSplitState] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [isSplitting, setIsSplitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [showDuo, setShowDuo] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);

  useEffect(() => {
    // fetch users from backend
    (async () => {
      try {
        const res = await fetch('http://localhost:4000/auth/users');
        const data = await res.json();
        if (res.ok) setSeededUsers(data.users || []);
      } catch (err) {
        console.warn('Could not fetch users', err);
      }
    })();

    // Always clear and re-register listeners before split starts
    mockSocketServer.listeners = {};
    mockSocketServer.on('update-split-status', (newState) => {
      console.debug('[Demo] update-split-status', newState);
      setSplitState(newState);
    });
    mockSocketServer.on('split-complete', (data) => {
      console.debug('[Demo] split-complete', data);
      setIsComplete(true);
      setTimeout(() => setReceipts(data.receipts), 2000);
    });
    if (isSplitting) {
      mockSocketServer.broadcast('update-split-status', mockSocketServer.state);
    }
  }, [isSplitting]);

  const handleStartSplit = () => {
    // When split starts, auto-pay all except current user, who gets Duo popup
    if (participants.length === 0) return alert("Add at least one participant!");
  // If user is not logged in, pick the first participant as the pending payer
  const pendingId = currentUser?.id ?? (participants[0]?.id ?? null);
  const initial = recalcShares(participants).map(p => ({ ...p, status: p.id === pendingId ? 'pending' : 'paid' }));
    // Update the mock server state first so emits find participants
    mockSocketServer.state.participants = initial;
    mockSocketServer.state.totalAmount = TOTAL_AMOUNT;
    setSplitState({ totalAmount: TOTAL_AMOUNT, participants: initial });
  setIsSplitting(true);
  console.debug('[Demo] handleStartSplit', { initial, pendingId });
    // If there are others, auto-pay them
    initial.forEach(p => {
      if (p.id !== pendingId) {
        setTimeout(() => {
          mockSocketServer.emit('user-paid', { userId: p.id });
        }, 500);
      }
    });
    // For current user, show Duo popup if present
    if (pendingId) {
      setPendingUser(pendingId);
      setShowDuo(true);
    }
  };


  // Unified handlePay: supports Duo auth for user 1, backend sync for all
  const handlePay = (userId) => {
    const user = splitState?.participants?.find((p) => p.id === userId);
    if (!user || user.status !== 'pending') return;
    // If this is the pending payer, show Duo popup
    if (user.id === pendingUser) {
      setPendingUser(userId);
      setShowDuo(true);
      return;
    }
    // Otherwise, run backend sync and mark as paying
    const newParticipants = splitState.participants.map((p) =>
      p.id === userId ? { ...p, status: 'paying' } : p
    );
    setSplitState({ ...splitState, participants: newParticipants });
    setTimeout(async () => {
      const n = splitState.participants.length;
      try {
        const payer = seededUsers.find(u => u.id === userId);
        const participant = splitState.participants.find(p => p.id === userId) || participants.find(p => p.id === userId);
        const share = participant?.share || 0;
        if (payer) {
          const newBalance = Number(payer.balance || 0) - Number(share || 0);
          const res = await fetch('http://localhost:4000/auth/set-balance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: payer.email, name: payer.name, balance: newBalance }),
          });
          const data = await res.json();
          if (res.ok && data.user) {
            setSeededUsers((prev) => prev.map(u => u.id === data.user.id ? data.user : u));
            if (currentUser && currentUser.email === data.user.email) {
              login(localStorage.getItem('liquidSplitToken'), data.user);
            }
          }
        }
      } catch (err) {
        console.warn('Could not update payer balance', err);
      }
      mockSocketServer.emit('user-paid', { userId, ownership: n > 0 ? (100 / n).toFixed(2) + '%' : '100%' });
    }, 1500);
  };

  // Approve Duo: backend sync and mark as paid
  const approveDuo = () => {
    setShowDuo(false);
    if (pendingUser) {
      // Mark as paying, then backend sync
      const newParticipants = splitState.participants.map((p) =>
        p.id === pendingUser ? { ...p, status: 'paying' } : p
      );
      setSplitState({ ...splitState, participants: newParticipants });
      setTimeout(async () => {
        const n = splitState.participants.length;
        try {
          const payer = seededUsers.find(u => u.id === pendingUser);
          const participant = splitState.participants.find(p => p.id === pendingUser) || participants.find(p => p.id === pendingUser);
          const share = participant?.share || 0;
          if (payer) {
            const newBalance = Number(payer.balance || 0) - Number(share || 0);
            const res = await fetch('http://localhost:4000/auth/set-balance', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: payer.email, name: payer.name, balance: newBalance }),
            });
            const data = await res.json();
            if (res.ok && data.user) {
              setSeededUsers((prev) => prev.map(u => u.id === data.user.id ? data.user : u));
              if (currentUser && currentUser.email === data.user.email) {
                login(localStorage.getItem('liquidSplitToken'), data.user);
              }
            }
          }
        } catch (err) {
          console.warn('Could not update payer balance', err);
        }
        // Always emit user-paid after Duo approval to trigger split-complete reliably
        mockSocketServer.emit('user-paid', { userId: pendingUser, ownership: n > 0 ? (100 / n).toFixed(2) + '%' : '100%' });
        setPendingUser(null);
        // Do NOT set isComplete here; rely on split-complete event for receipts
      }, 1500);
    }
  };

  const cancelDuo = () => {
    setShowDuo(false);
    setPendingUser(null);
    alert("Authentication timed out or denied.");
  };

  // participants is always splitState?.participants || [] below
  const liveParticipants = isSplitting ? (splitState?.participants ?? []) : participants;
  const paidCount = liveParticipants.filter(p => p.status === 'paid').length || 0;
  const totalCount = liveParticipants.length || 0;
  const progress = totalCount > 0 ? (paidCount / totalCount) * 100 : 0;

  // Remove auto-complete logic: rely on split-complete event for receipts and completion

  return (
    <div className="demo-page-container">
      <motion.div className="demo-card-modern" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
        <div className="demo-header">
          <h2 className="text-3xl font-bold text-gray-800">LiquidSplit Demo</h2>
          <p className="text-gray-500 mt-2">Mock checkout with Duo-style authentication.</p>
        </div>

        <div className="demo-content-grid">
          <div className="checkout-panel">
            <div className="item-row">
              <h3 className="text-xl font-semibold">Smart 4K TV</h3>
              <p className="text-2xl font-bold text-gray-800">$300.00</p>
            </div>

            <div className="participants-section">
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
                    {isSplitting && user.status === 'pending' && (
                      <button onClick={() => handlePay(user.id)} className="pay-btn-modern">Pay</button>
                    )}
                    {isSplitting && user.status === 'paid' && <CheckIcon />}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="action-panel-modern">
            {!isSplitting ? (
              <button onClick={handleStartSplit} className="start-split-btn-modern" style={{ marginTop: '1rem' }}>
                Start Split Purchase
              </button>
            ) : !isComplete ? (
              <div className="text-center w-full">
                <h3 className="text-xl font-semibold text-gray-700">Awaiting Payments...</h3>
                <p className="text-gray-500 mt-2">{paidCount} of {totalCount} participants have paid.</p>
                <div className="progress-bar-container">
                  <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            ) : receipts.length === 0 ? (
              <div className="text-center w-full">
                <SuccessIcon />
                <h3 className="text-2xl font-semibold text-green-600 mt-4">Payment Successful!</h3>
                <p className="text-gray-500 mt-2">Generating receipts...</p>
              </div>
            ) : (
              <div className="w-full">
                <h3 className="text-2xl font-semibold text-green-600 text-center mb-4">Split Complete!</h3>
                <div className="space-y-3">
                  {receipts.map((receipt, i) => (
                    <div key={i} className="receipt-card-modern" style={{ animationDelay: `${i * 150}ms` }}>
                      <p className="font-bold text-gray-800">{receipt.owner}'s Digital Receipt</p>
                      <div className="flex justify-between text-sm text-gray-600 mt-1">
                        <span>Value: ${receipt.value.toFixed(2)}</span>
                        <span>Ownership: {receipt.ownership}</span>
                      </div>
                      <p className="text-xs text-indigo-500 mt-2 font-mono">NFT ID: {receipt.nftId}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <Link to="/" className="back-link-modern">&larr; Back to Home</Link>

      <AnimatePresence>
        {showDuo && <DuoAuthPopup onApprove={approveDuo} onCancel={cancelDuo} ttl={15} />}
      </AnimatePresence>
    </div>
  );
}

export default Demo;
