import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

/* ---------- ICONS ---------- */
const CheckIcon = () => (
  <svg
    className="w-6 h-6 text-green-500"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
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

/* ---------- Helper ---------- */
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
};

/* ---------- MAIN DEMO ---------- */
function Demo() {
  const [potId, setPotId] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [splitStarted, setSplitStarted] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [total, setTotal] = useState(0);
  const [receipts, setReceipts] = useState([]);
  const [authModal, setAuthModal] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [showReceipts, setShowReceipts] = useState(false);

  /* --- Create Pot on Load --- */
  useEffect(() => {
    async function createPot() {
      try {
        const res = await fetch("http://localhost:4000/pots", {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ name: "Demo Pot" }),
        });

        if (res.status === 401) {
          alert("You must log in before starting a split.");
          window.location.href = "/login";
          return;
        }

        const pot = await res.json();
        setPotId(pot.id);
      } catch (err) {
        console.error("❌ Pot creation failed:", err);
      }
    }
    createPot();
  }, []);

  /* --- Add Member --- */
  const handleAddMember = async () => {
    const name = prompt("Enter the name of a registered user:");
    if (!name || name.trim() === "") return alert("Name cannot be empty.");

    try {
      const usersRes = await fetch("http://localhost:4000/auth/users", {
        headers: getAuthHeaders(),
      });
      const { users } = await usersRes.json();

      const user = users.find(
        (u) => u.name.toLowerCase() === name.trim().toLowerCase()
      );
      if (!user) {
        alert(`User "${name}" not found. Please have them sign up first.`);
        return;
      }

      const shareInput = prompt(
        `${user.name}'s current balance: $${user.balance.toFixed(
          2
        )}\nEnter amount to contribute:`
      );

      const share = parseFloat(shareInput);
      if (isNaN(share) || share <= 0) {
        alert("Invalid amount.");
        return;
      }

      if (share > user.balance) {
        alert(`❌ ${user.name} cannot contribute more than their balance.`);
        return;
      }

      if (!potId) {
        alert("Please create a pot first.");
        return;
      }

      const res = await fetch(`http://localhost:4000/pots/${potId}/members`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId: user.id, share }),
      });

      if (!res.ok) throw new Error("Failed to add member to backend");

      await fetch("http://localhost:4000/auth/set-balance", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          email: user.email,
          newBalance: user.balance - share,
        }),
      });

      const potRes = await fetch(`http://localhost:4000/pots/${potId}`, {
        headers: getAuthHeaders(),
      });
      const potData = await potRes.json();

      setParticipants(
        potData.members.map((m) => ({
          id: m.userId,
          name: users.find((u) => u.id === m.userId)?.name || "Unknown",
          share: m.share,
          status: "pending",
        }))
      );

      const newTotal = potData.members.reduce(
        (sum, m) => sum + parseFloat(m.share || 0),
        0
      );
      setTotal(newTotal);
    } catch (err) {
      console.error("❌ Add member failed:", err);
    }
  };

  /* --- Start Split --- */
  const handleStartSplit = () => {
    if (participants.length < 2) {
      alert("You need at least 2 members to start the split!");
      return;
    }
    setSplitStarted(true);
  };

  /* --- Auth Modal Flow --- */
  const openAuthenticator = (user) => {
    setAuthModal({ user, countdown: 15 });

    const timer = setInterval(() => {
      setAuthModal((prev) => {
        if (!prev) return prev;
        if (prev.countdown <= 1) {
          clearInterval(timer);
          return null;
        }
        return { ...prev, countdown: prev.countdown - 1 };
      });
    }, 1000);
  };

  const approvePayment = (user) => {
    setAuthLoading(true);
    setTimeout(async () => {
      setAuthLoading(false);
      setAuthModal(null);
      try {
        await handlePaymentSuccess(user.id);
      } catch (err) {
        console.error("❌ Payment flow failed:", err);
        alert("We couldn't finalize that payment. Please try again.");
      }
    }, 2000);
  };

  const denyPayment = () => {
    alert("❌ Authentication denied. Payment cancelled.");
    setAuthModal(null);
  };

  /* --- Payment Success Flow --- */
  const handlePaymentSuccess = async (id) => {
    setParticipants((prev) => {
      const updated = prev.map((p) =>
        p.id === id ? { ...p, status: "paid" } : p
      );
      const allPaid = updated.every((p) => p.status === "paid");
      if (allPaid) setIsComplete(true);
      return updated;
    });

    const payer = participants.find((p) => p.id === id);
    if (!payer) return;

    const shareValue = Number(payer.share) || 0;
    const ownershipShare = `${(100 / Math.max(participants.length, 1)).toFixed(
      2
    )}%`;
    const nftId = `0x${Math.random().toString(16).slice(2, 10).toUpperCase()}`;

    if (!potId) {
      setReceipts((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          owner: payer.name,
          value: shareValue,
          ownership: ownershipShare,
          nftId,
          timestamp: new Date().toISOString(),
          txHash: `0x${Math.random()
            .toString(16)
            .slice(2, 10)
            .toUpperCase()}`,
        },
      ]);
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:4000/pots/${potId}/receipts`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            payerId: payer.id,
            amount: shareValue,
            description: JSON.stringify({ ownership: ownershipShare, nftId }),
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        const message = data?.error || "Failed to save receipt.";
        throw new Error(message);
      }

      const receipt = data.receipt;
      setReceipts((prev) => [
        ...prev,
        {
          id: receipt.id,
          owner: receipt.payer?.name || payer.name,
          value: Number(receipt.amount) || shareValue,
          ownership: ownershipShare,
          nftId,
          timestamp: receipt.timestamp,
          txHash: `0x${receipt.id
            .toString(16)
            .padStart(8, "0")
            .toUpperCase()}`,
        },
      ]);
    } catch (err) {
      console.error("❌ Saving receipt failed:", err);
      setReceipts((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          owner: payer.name,
          value: shareValue,
          ownership: ownershipShare,
          nftId,
          timestamp: new Date().toISOString(),
          txHash: `0x${Math.random()
            .toString(16)
            .slice(2, 10)
            .toUpperCase()}`,
          error: true,
        },
      ]);
    }
  };

  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => {
        setShowReceipts(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isComplete]);

  useEffect(() => {
    if (!showReceipts || !potId) return;

    async function fetchReceipts() {
      try {
        const response = await fetch(
          `http://localhost:4000/pots/${potId}/receipts`,
          { headers: getAuthHeaders() }
        );
        if (!response.ok) {
          console.error("❌ Failed to load receipts:", response.statusText);
          return;
        }

        const data = await response.json();
        if (!Array.isArray(data.receipts)) return;

        const fallbackOwnership = `${(
          100 / Math.max(participants.length, 1)
        ).toFixed(2)}%`;

        const hydrated = data.receipts.map((receipt) => {
          let metadata = {};
          if (receipt.description) {
            try {
              metadata = JSON.parse(receipt.description);
            } catch (err) {
              console.warn("⚠️ Could not parse receipt metadata:", err);
            }
          }

          const baseId = receipt.id
            .toString(16)
            .padStart(8, "0")
            .toUpperCase();

          return {
            id: receipt.id,
            owner: receipt.payer?.name || "Unknown",
            value: Number(receipt.amount) || 0,
            ownership: metadata.ownership || fallbackOwnership,
            nftId: metadata.nftId || `0x${baseId}`,
            timestamp: receipt.timestamp,
            txHash: `0x${baseId}`,
          };
        });

        setReceipts(hydrated);
      } catch (error) {
        console.error("❌ Fetch receipts failed:", error);
      }
    }

    fetchReceipts();
  }, [showReceipts, potId, participants.length]);

  return (
    <div className="demo-page-container">
      <motion.div
        className="demo-card-modern"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="demo-header">
          <h2 className="text-3xl font-bold text-gray-800">LiquidSplit Demo</h2>
          <p className="text-gray-500 mt-2">
            Add members, approve payments, and generate receipts.
          </p>
        </div>

        <div className="demo-content-grid">
          <div className="checkout-panel">
            <div className="participants-section">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h4 style={{ fontWeight: 600 }}>Participants</h4>
                {!splitStarted && (
                  <button
                    onClick={handleAddMember}
                    className="add-people action-btn-modern"
                    style={{ marginLeft: "1rem" }}
                  >
                    Add Member
                  </button>
                )}
              </div>

              <div className="space-y-3 mt-4">
                {participants.length === 0 ? (
                  <p className="text-gray-400 italic text-sm">
                    No participants yet.
                  </p>
                ) : (
                  participants.map((user) => (
                    <div
                      key={user.id}
                      className="participant-row-modern flex items-center justify-between"
                    >
                      <span className="font-medium text-gray-700">
                        {user.name}
                      </span>
                      <span className="text-gray-600 font-semibold">
                        ${user.share.toFixed(2)}
                      </span>
                      {splitStarted &&
                        (user.status === "pending" ? (
                          <button
                            onClick={() => openAuthenticator(user)}
                            className="pay-btn-modern"
                          >
                            Pay
                          </button>
                        ) : (
                          <CheckIcon />
                        ))}
                    </div>
                  ))
                )}
              </div>

              {participants.length > 0 && (
                <div className="mt-5 text-right text-gray-700 font-semibold">
                  Total: ${total.toFixed(2)}
                </div>
              )}
            </div>
          </div>

          <div className="action-panel-modern text-center">
            {!splitStarted && !isComplete && (
              <button
                onClick={handleStartSplit}
                className="start-split-btn-modern mt-6"
              >
                Start Split
              </button>
            )}

            {splitStarted && !isComplete && (
              <p className="text-gray-500 mt-4">
                Waiting for payments...{" "}
                {participants.filter((p) => p.status === "paid").length} /{" "}
                {participants.length} paid
              </p>
            )}

            {isComplete && !showReceipts && (
              <div className="text-center mt-6">
                <SuccessIcon />
                <h3 className="text-2xl font-semibold text-green-600 mt-4">
                  Split Complete!
                </h3>
                <p className="text-gray-500 mt-2">
                  Everyone has paid successfully.
                </p>
              </div>
            )}

            {showReceipts && (
              <motion.div
                className="mt-8 flex flex-col items-center"
                initial="hidden"
                animate="visible"
                variants={{
                  visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.1 },
                  },
                  hidden: { opacity: 0 },
                }}
              >
                <h4 className="font-semibold text-gray-800 mb-3">Receipts</h4>
                <div className="flex flex-col gap-4 items-center w-full max-w-md">
                  {receipts.map((r, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20, boxShadow: "0 0 0 rgba(0, 255, 0, 0)" }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        boxShadow: [
                          "0 0 0 rgba(0, 255, 0, 0)",
                          "0 0 15px rgba(34,197,94,0.5)",
                          "0 0 0 rgba(0, 255, 0, 0)",
                        ],
                      }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      className="receipt-card-modern border border-gray-200 rounded-xl bg-white shadow-sm p-3 w-full relative"
                    >
                      <h5 className="font-semibold text-gray-900 text-base mb-1">
                        {r.owner} — ${r.value.toFixed(2)}
                      </h5>
                      <p className="text-gray-600 text-xs">
                        Ownership: <span className="font-medium">{r.ownership}</span>
                      </p>
                      <p className="text-[11px] text-gray-400 truncate mt-1">NFT ID: {r.nftId}</p>
                      <p className="text-[10px] text-gray-500 font-mono mt-1">
                        Tx Hash: {r.txHash}
                      </p>
                      <p className="text-[10px] text-gray-400 italic mt-1">
                        Issued {new Date(r.timestamp).toLocaleString()}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ✅ DUO-STYLE AUTHENTICATOR POP-UP */}
      {authModal && (
        <div className="duo-overlay">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="duo-box"
          >
            <h3 className="duo-title">
              Approve this transaction with your authenticator
            </h3>
            <p className="duo-desc">Please confirm this payment to proceed.</p>
            <p className="duo-timer">
              This request will expire in {authModal.countdown}s
            </p>

            {authLoading ? (
              <div>
                <div className="loader mx-auto mb-3"></div>
                <p>Authenticating...</p>
              </div>
            ) : (
              <div className="duo-actions">
                <button
                  onClick={() => approvePayment(authModal.user)}
                  className="approve-btn"
                >
                  Approve
                </button>
                <button onClick={denyPayment} className="cancel-btn">
                  Deny
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}

      <Link to="/" className="back-link-modern">
        &larr; Back to Home
      </Link>
    </div>
  );
}

export default Demo;
