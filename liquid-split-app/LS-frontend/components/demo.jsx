import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

/* ---------------------------------------------------------------------- */
/* ---------- MODIFIED POPUP MODAL COMPONENT (with internal state) ---------- */
/* ---------------------------------------------------------------------- */
const PopupModal = ({ popupData, onConfirm, onCancel }) => {
  if (!popupData) return null;

  // *** FIX: Manage input value locally within the modal component ***
  const [localInputValue, setLocalInputValue] = useState(popupData.inputValue || "");
  
  // Update local state if the initial value passed from parent changes
  useEffect(() => {
    setLocalInputValue(popupData.inputValue || "");
  }, [popupData.inputValue]);

  // Use a modified confirm handler to pass the local state value back
  const handleConfirm = () => {
    // onConfirm is now expected to accept the final input value
    onConfirm(localInputValue); 
  };
  
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm text-center"
      >
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          {popupData.title}
        </h3>
        <p className="text-gray-600 mb-4 whitespace-pre-line">{popupData.message}</p>

        {popupData.type === "input" && (
          <input
            type={popupData.inputType || "text"}
            placeholder={popupData.placeholder || ""}
            className="w-full border border-gray-300 rounded-lg p-2 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            // *** Bind to LOCAL state ***
            value={localInputValue}
            onChange={(e) => setLocalInputValue(e.target.value)}
          />
        )}

        <div className="flex justify-center gap-3">
          {popupData.showCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleConfirm} // *** Use local handler ***
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            OK
          </button>
        </div>
      </motion.div>
    </div>
  );
};

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
  const [popupData, setPopupData] = useState(null);
  // tempInput state is no longer used for controlling the input value, 
  // but it's kept to maintain the structure of other logic if it relied on it.
  const [tempInput, setTempInput] = useState(""); 

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
          setPopupData({
            title: "Login Required",
            message: "You must log in before starting a split.",
            // This onConfirm doesn't take an input value
            onConfirm: () => (window.location.href = "/login"),
          });
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

  /* ---------------------------------------------------------------------- */
  /* --- Add Member (MODIFIED to rely on Modal's confirmation value) --- */
  /* ---------------------------------------------------------------------- */
  const handleAddMember = useCallback(() => {
    setPopupData({
      title: "Add Member",
      message: "Enter the name of a registered user:",
      type: "input",
      // We pass the initial value for local state
      inputValue: "", 
      showCancel: true,
      // *** MODIFIED: The function now accepts the input value 'name' from the Modal ***
      onConfirm: async (name) => {
        name = name.trim();
        if (!name) {
          setPopupData({
            title: "Invalid Input",
            message: "Name cannot be empty.",
          });
          return;
        }
        setPopupData(null);
        await proceedAddMember(name);
      },
      // setInputValue is no longer strictly needed but kept as placeholder
      setInputValue: setTempInput, 
    });
  }, [setPopupData]); // Dependencies for useCallback

  const proceedAddMember = async (name) => {
    try {
      const usersRes = await fetch("http://localhost:4000/auth/users", {
        headers: getAuthHeaders(),
      });
      const { users } = await usersRes.json();

      const user = users.find(
        (u) => u.name.toLowerCase() === name.toLowerCase()
      );
      if (!user) {
        setPopupData({
          title: "User Not Found",
          message: `User "${name}" not found. Please have them sign up first.`,
        });
        return;
      }

      setPopupData({
        title: "Contribution",
        message: `${user.name}'s current balance: $${user.balance.toFixed(
          2
        )}\nEnter amount to contribute:`,
        type: "input",
        inputType: "number",
        inputValue: "", // Initial value for the contribution input
        showCancel: true,
        // *** MODIFIED: The function now accepts the input value 'shareString' ***
        onConfirm: async (shareString) => {
          const share = parseFloat(shareString);
          if (isNaN(share) || share <= 0) {
            setPopupData({
              title: "Invalid Amount",
              message: "Please enter a valid positive number.",
            });
            return;
          }
          if (share > user.balance) {
            setPopupData({
              title: "Insufficient Balance",
              message: `${user.name} cannot contribute more than their balance.`,
            });
            return;
          }
          setPopupData(null);
          await addMemberToPot(user, share);
        },
        // setInputValue is no longer strictly needed but kept as placeholder
        setInputValue: setTempInput, 
      });
    } catch (err) {
      console.error("❌ Add member failed:", err);
    }
  };

  const addMemberToPot = async (user, share) => {
    try {
      if (!potId) {
        setPopupData({
          title: "Error",
          message: "Please create a pot first.",
        });
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
          name: user.name,
          share: m.share,
          status: "pending",
        }))
      );

      const newTotal = potData.members.reduce(
        (sum, m) => sum + parseFloat(m.share || 0),
        0
      );
      setTotal(newTotal);

      setPopupData({
        title: "Member Added",
        message: `${user.name} has been added successfully!`,
      });
    } catch (err) {
      console.error("❌ Add member failed:", err);
    }
  };
/* ---------------------------------------------------------------------- */

  /* --- Start Split --- */
  const handleStartSplit = () => {
    if (participants.length < 2) {
      setPopupData({
        title: "Not Enough Members",
        message: "You need at least 2 members to start the split!",
      });
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

  const approvePayment = async (user) => {
    setAuthLoading(true);
    setTimeout(async () => {
      setAuthLoading(false);
      setAuthModal(null);
      handlePaymentSuccess(user.id);
    }, 2000);
  };

  const denyPayment = () => {
    setPopupData({
      title: "Payment Denied",
      message: "Authentication denied. Payment cancelled.",
    });
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

    const user = participants.find((p) => p.id === id);
    const newReceipt = {
      owner: user.name,
      value: user.share,
      ownership: `${(100 / participants.length).toFixed(2)}%`,
      nftId: `0x${Math.random().toString(16).substr(2, 8).toUpperCase()}`,
    };
    setReceipts((prev) => [...prev, newReceipt]);
  };

  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => {
        setShowReceipts(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isComplete]);

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
                        Tx Hash: 0x{Math.random().toString(16).substring(2, 10).toUpperCase()}...
                      </p>
                      <p className="text-[10px] text-gray-400 italic mt-1">
                        Issued {new Date().toLocaleTimeString()}
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

      {/* ✅ GENERIC POP-UP MODAL (Now uses internal state for input) */}
      <AnimatePresence>
        <PopupModal
          popupData={popupData}
          // The onConfirm function passed here is the one defined in handleAddMember/proceedAddMember, 
          // which now expects the input value as its first argument.
          onConfirm={popupData?.onConfirm || (() => setPopupData(null))}
          onCancel={() => setPopupData(null)}
        />
      </AnimatePresence>

      <Link to="/" className="back-link-modern">
        &larr; Back to Home
      </Link>
    </div>
  );
}

export default Demo;