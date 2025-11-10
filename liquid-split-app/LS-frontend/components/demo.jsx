import React, { useState, useEffect, useCallback, useRef } from "react";
import "./demo.css";
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
  const token =
    localStorage.getItem("liquidSplitToken") || localStorage.getItem("token");
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
  const [receipts, setReceipts] = useState([]);
  const [authModal, setAuthModal] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [showReceipts, setShowReceipts] = useState(false);
  const [popupData, setPopupData] = useState(null);
  // tempInput state is no longer used for controlling the input value, 
  // but it's kept to maintain the structure of other logic if it relied on it.
  const [tempInput, setTempInput] = useState(""); 
  const [potName, setPotName] = useState("Demo Pot");
  const [groups, setGroups] = useState([]);
  const [showGroupDropdown, setShowGroupDropdown] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [potCreatorId, setPotCreatorId] = useState(null);
  const [connectionIssue, setConnectionIssue] = useState(false);
  const [potStatus, setPotStatus] = useState("PENDING");

  const hasRequestedPot = useRef(false);
  const consecutiveFailures = useRef(0);

  // Decode JWT to get current user ID
  useEffect(() => {
    const token = localStorage.getItem("token") || localStorage.getItem("liquidSplitToken");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setCurrentUserId(payload.userId);
      } catch (err) {
        console.error("Failed to decode token:", err);
      }
    }
  }, []);

  const requestPotCreation = useCallback(async (preferredName) => {
    try {
      const desiredName =
        typeof preferredName === "string" && preferredName.trim().length > 0
          ? preferredName.trim()
          : "Demo Pot";

      const res = await fetch("http://localhost:4000/pots", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: desiredName }),
      });

      if (res.status === 401) {
        setPopupData({
          title: "Login Required",
          message: "You must log in before starting a split.",
          onConfirm: () => (window.location.href = "/login"),
        });
        return null;
      }

      if (res.status === 429) {
        setPopupData({
          title: "Too Many Requests",
          message: "Please wait a moment before trying again.",
        });
        return null;
      }

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Pot creation failed:", res.status, errorText);
        throw new Error(`Server returned ${res.status}: ${errorText}`);
      }

      let data;
      try {
        data = await res.json();
      } catch (parseError) {
        console.error("Failed to parse JSON response:", parseError);
        throw new Error("Invalid response from server");
      }

      const createdPot = data?.pot || data;
      if (!createdPot?.id) {
        throw new Error("Invalid pot response - missing pot ID");
      }

      setPotId(createdPot.id);
      setPotName(createdPot.name || desiredName);
      setPotCreatorId(createdPot.creatorId || currentUserId);
      window.dispatchEvent(new Event("pots:refresh"));
      return createdPot.id;
    } catch (err) {
      console.error("❌ Pot creation failed:", err);
      setPopupData((prev) =>
        prev ?? {
          title: "Error Creating Pot",
          message: "We couldn’t create the demo pot. Please try again.",
        }
      );
      return null;
    }
  }, [setPopupData, currentUserId]);

  /* --- Create Pot on Load (once) --- */
  useEffect(() => {
    if (!potId && !hasRequestedPot.current) {
      hasRequestedPot.current = true;
      requestPotCreation();
    }
  }, [potId, requestPotCreation]);

  /* --- Load Groups on Mount --- */
  useEffect(() => {
    const loadGroups = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:4000/groups', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setGroups(data.groups || []);
        }
      } catch (err) {
        console.error('Error loading groups:', err);
      }
    };
    loadGroups();
  }, []);

  /* --- Poll Pot Data for Real-Time Updates --- */
  useEffect(() => {
    if (!potId) return;

    const pollPotData = async () => {
      try {
        const potRes = await fetch(`http://localhost:4000/pots/${potId}`, {
          headers: getAuthHeaders(),
        });
        
        if (!potRes.ok) {
          // Silently fail on rate limit or server errors during polling
          if (potRes.status === 429 || potRes.status >= 500) {
            console.warn(`Polling failed with status ${potRes.status}, will retry...`);
            return;
          }
        }
        
        if (potRes.ok) {
          let potData;
          try {
            potData = await potRes.json();
          } catch (parseError) {
            console.error("Failed to parse pot data JSON:", parseError);
            return;
          }
          
          // Update participants with latest payment status
          if (potData.members && Array.isArray(potData.members)) {
            setParticipants(
              potData.members.map((m) => ({
                id: m.userId,
                name: m.user?.name || "Unknown",
                status: "pending",
                paymentStatus: m.paymentStatus || "PENDING",
              }))
            );
          }

          // Update pot name if changed
          if (potData.name && potData.name !== potName) {
            setPotName(potData.name);
          }

          // Update creator ID if not set
          if (!potCreatorId && potData.creatorId) {
            setPotCreatorId(potData.creatorId);
          }

          // Update pot status
          if (potData.status) {
            setPotStatus(potData.status);
          }

          // Reset failure counter on success
          consecutiveFailures.current = 0;
          setConnectionIssue(false);
        }
      } catch (err) {
        // Network errors - track failures
        consecutiveFailures.current += 1;
        console.error("Failed to poll pot data (network error):", err.message);
        
        // Show warning after 3 consecutive failures
        if (consecutiveFailures.current >= 3) {
          setConnectionIssue(true);
        }
      }
    };

    // Poll immediately, then every 3 seconds
    pollPotData();
    const interval = setInterval(pollPotData, 3000);

    // Listen for custom pot update events for immediate refresh
    const handlePotUpdate = (e) => {
      if (e.detail?.potId === potId) {
        pollPotData();
      }
    };
    window.addEventListener("pot:updated", handlePotUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("pot:updated", handlePotUpdate);
    };
  }, [potId, potName, potCreatorId]);

  /* ---------------------------------------------------------------------- */
  /* --- Add Member (MODIFIED to rely on Modal's confirmation value) --- */
  /* ---------------------------------------------------------------------- */
  const addMemberToPot = useCallback(
    async (user) => {
      try {
        let targetPotId = potId;
        if (!targetPotId) {
          targetPotId = await requestPotCreation();
          if (!targetPotId) {
            setPopupData({
              title: "Error",
              message: "Please create a pot first.",
            });
            return;
          }
        }

        const res = await fetch(
          `http://localhost:4000/pots/${targetPotId}/members`,
          {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ userId: user.id }),
          }
        );

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.error || "Failed to add member to backend");
        }

        const potRes = await fetch(
          `http://localhost:4000/pots/${targetPotId}`,
          {
            headers: getAuthHeaders(),
          }
        );
        const potData = await potRes.json();

        setPotName(potData.name || "Demo Pot");
        setParticipants(
          potData.members.map((m) => ({
            id: m.userId,
            name: m.user?.name || user.name,
            status: "pending",
          }))
        );

        setPopupData({
          title: "Member Added",
          message: `${user.name} has been added successfully!`,
        });
        setPotId(targetPotId);
      } catch (err) {
        console.error("❌ Add member failed:", err);
        setPopupData({
          title: "Add Member Failed",
          message:
            err.message ||
            "We couldn't add that member. Please try again in a moment.",
        });
      }
    },
    [potId, requestPotCreation, setPopupData]
  );

  const handleSetPotName = useCallback(() => {
    setPopupData({
      title: "Name Your Pot",
      message: "Give this demo pot a name or goal (e.g., Rent, Family Trip).",
      type: "input",
      inputValue: potName || "",
      showCancel: true,
      onConfirm: async (inputName) => {
        const nextName = (inputName ?? "").trim();
        if (!nextName) {
          setPopupData({
            title: "Invalid Name",
            message: "Pot name cannot be empty.",
          });
          return;
        }

        setPopupData(null);
        const ensuredPotId = potId ?? (await requestPotCreation(nextName));
        if (!ensuredPotId) {
          return;
        }

        try {
          const response = await fetch(
            `http://localhost:4000/pots/${ensuredPotId}`,
            {
              method: "PATCH",
              headers: getAuthHeaders(),
              body: JSON.stringify({ name: nextName }),
            }
          );
          const data = await response.json();
          if (!response.ok) {
            throw new Error(
              data.error || "Unable to update the pot name right now."
            );
          }
          const updatedName = data.pot?.name || nextName;
          setPotId(ensuredPotId);
          setPotName(updatedName);
          window.dispatchEvent(new Event("pots:refresh"));
          setPopupData({
            title: "Pot Name Updated",
            message: `This pot is now called "${updatedName}".`,
          });
        } catch (error) {
          console.error("❌ Update pot name failed:", error);
          setPopupData({
            title: "Update Failed",
            message:
              error.message || "We couldn't update the pot name. Try again soon.",
          });
        }
      },
      setInputValue: setTempInput,
    });
  }, [potId, potName, requestPotCreation, setPopupData]);



  const proceedAddMember = useCallback(
    async (name) => {
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

        setPopupData(null);
        await addMemberToPot(user);
      } catch (err) {
        console.error("❌ Add member failed:", err);
        setPopupData({
          title: "Error",
          message: "We couldn't load users. Please try again later.",
        });
      }
    },
    [addMemberToPot, setPopupData]
  );

  const handleAddGroup = useCallback(() => {
    if (groups.length === 0) {
      setPopupData({
        title: "No Groups Available",
        message: "Please create a group first from the Friends page before starting a split.",
        onConfirm: () => setPopupData(null),
      });
      return;
    }
    
    if (selectedGroup) {
      setPopupData({
        title: "Group Already Added",
        message: "You can only add one group per split. Remove the current group to add a different one.",
        onConfirm: () => setPopupData(null),
      });
      return;
    }
    
    setShowGroupDropdown(true);
  }, [groups, selectedGroup, setPopupData]);

  const handleSelectGroup = useCallback(async (group) => {
    setShowGroupDropdown(false);
    
    // Add all group members to the pot
    const failedMembers = [];
    const skippedMembers = [];
    
    // Ensure pot exists first
    let targetPotId = potId;
    if (!targetPotId) {
      targetPotId = await requestPotCreation();
      if (!targetPotId) {
        setPopupData({
          title: "Error",
          message: "Failed to create pot. Please try again.",
        });
        return;
      }
    }
    
    // Fetch current pot members to get accurate list
    let existingMemberIds = new Set();
    try {
      const potRes = await fetch(`http://localhost:4000/pots/${targetPotId}`, {
        headers: getAuthHeaders(),
      });
      if (potRes.ok) {
        const potData = await potRes.json();
        existingMemberIds = new Set(potData.members.map(m => m.userId));
      }
    } catch (err) {
      console.error("Failed to fetch pot members:", err);
      // Fallback to participants state
      existingMemberIds = new Set(participants.map(p => p.id));
    }
    
    for (const member of group.members) {
      const user = member.user;
      
      // Skip if user is already in the pot
      if (existingMemberIds.has(user.id)) {
        skippedMembers.push(user.name);
        continue;
      }
      
      try {

        const res = await fetch(
          `http://localhost:4000/pots/${targetPotId}/members`,
          {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ userId: user.id }),
          }
        );

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.error || "Failed to add member");
        }
      } catch (err) {
        failedMembers.push({ name: user.name, error: err.message });
      }
    }
    
    // Refresh pot data after all attempts and send notifications
    if (targetPotId) {
      try {
        const potRes = await fetch(`http://localhost:4000/pots/${targetPotId}`, {
          headers: getAuthHeaders(),
        });
        const potData = await potRes.json();
        
        // Update participants with payment status
        setParticipants(
          potData.members.map((m) => ({
            id: m.userId,
            name: m.user?.name || "Unknown",
            status: "pending",
            paymentStatus: m.paymentStatus || "PENDING",
          }))
        );

        // Send notifications only to non-creator members
        for (const member of potData.members) {
          if (member.userId !== currentUserId) {
            try {
              await fetch("http://localhost:4000/notifications", {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({
                  userId: member.userId,
                  potId: targetPotId,
                  type: "PAYMENT_REQUEST",
                  message: `You've been added to pot "${potData.name}". Please confirm your participation.`,
                }),
              });
            } catch (err) {
              console.error(`Failed to send notification to ${member.user?.name}:`, err);
            }
          }
        }
      } catch (err) {
        console.error("Failed to refresh pot:", err);
      }
    }
    
    // Show results
    if (failedMembers.length > 0) {
      const errorMessages = failedMembers.map(m => `• ${m.name}: ${m.error}`).join('\n');
      setPopupData({
        title: "Some Members Could Not Be Added",
        message: `The following members could not be added:\n\n${errorMessages}`,
      });
    } else {
      setSelectedGroup(group);
      setPopupData({
        title: "Group Added",
        message: `Members from "${group.name}" have been added successfully!`,
      });
    }
  }, [potId, requestPotCreation, setPopupData, participants, currentUserId]);

  const handleStartSplit = async () => {
    if (!selectedGroup) {
      setPopupData({
        title: "No Group Added",
        message: "Please add a group before starting the split!",
      });
      return;
    }
    
    if (participants.length < 2) {
      setPopupData({
        title: "Not Enough Members",
        message: "The selected group must have at least 2 members to start the split!",
      });
      return;
    }

    // Call finalize endpoint to check if all members have paid
    try {
      const res = await fetch(`http://localhost:4000/pots/${potId}/finalize`, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      const data = await res.json();

      if (!res.ok) {
        setPopupData({
          title: "Cannot Finalize",
          message: data.error || "Unable to finalize the pot. Please try again.",
        });
        return;
      }

      // Success - all members have paid
      setSplitStarted(true);
      setPotStatus("FINALIZED");
      
      // Trigger pots page refresh
      window.dispatchEvent(new Event("pots:refresh"));
      
      setPopupData({
        title: "Pot Finalized!",
        message: "All members have confirmed payment. The pot has been saved to 'Your Pots' page.",
        onConfirm: () => {
          // Optionally redirect to pots page
          window.location.href = "/pots";
        },
      });
    } catch (err) {
      console.error("Failed to finalize pot:", err);
      setPopupData({
        title: "Error",
        message: "Failed to finalize pot. Please try again.",
      });
    }
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
          {connectionIssue && (
            <div style={{
              padding: "0.75rem 1rem",
              background: "#fef3c7",
              border: "1px solid #f59e0b",
              borderRadius: "0.5rem",
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.9rem",
              color: "#92400e",
            }}>
              <span style={{ fontSize: "1.2rem" }}>⚠️</span>
              <span>Connection issue detected. Some features may not update in real-time. Retrying...</span>
            </div>
          )}
          <div className="demo-header-text">
            <h2 className="text-3xl font-bold text-gray-800">LiquidSplit Demo</h2>
            <p className="text-gray-500 mt-2">
              Add members, approve payments, and generate receipts.
            </p>
          </div>
          <div className="pot-name-controls">
            <div className="pot-name-chip">
              <span className="pot-name-label">Pot Name</span>
              <strong>{potName?.trim() ? potName : "Demo Pot"}</strong>
            </div>
            <button
              type="button"
              className="pot-name-btn"
              onClick={handleSetPotName}
            >
              Set Pot Name
            </button>
          </div>
        </div>

        <div className="demo-content-grid">
          <div className="checkout-panel">
            <div className="participants-section">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
                <h4 style={{ fontWeight: 600 }}>Groups</h4>
                {!splitStarted && (
                  <div style={{ position: "relative" }}>
                    <button
                      onClick={handleAddGroup}
                      className="add-people action-btn-modern"
                      style={{ marginLeft: "1rem" }}
                    >
                      Add Group
                    </button>
                    
                    {/* Group Dropdown */}
                    {showGroupDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="group-dropdown"
                        style={{
                          position: "absolute",
                          top: "calc(100% + 0.5rem)",
                          right: 0,
                          background: "white",
                          border: "1px solid #e5e7eb",
                          borderRadius: "0.75rem",
                          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
                          minWidth: "250px",
                          maxHeight: "300px",
                          overflowY: "auto",
                          zIndex: 100,
                        }}
                      >
                        <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e5e7eb", fontWeight: 600, fontSize: "0.9rem" }}>
                          Select Your Group
                        </div>
                        {groups.filter(group => group.creatorId === currentUserId).length === 0 ? (
                          <div style={{ padding: "1rem", textAlign: "center", color: "#6b7280", fontSize: "0.9rem" }}>
                            You haven't created any groups yet
                          </div>
                        ) : (
                          groups.filter(group => group.creatorId === currentUserId).map((group) => (
                          <div
                            key={group.id}
                            onClick={() => handleSelectGroup(group)}
                            style={{
                              padding: "0.75rem 1rem",
                              cursor: "pointer",
                              borderBottom: "1px solid #f3f4f6",
                              transition: "background 0.2s",
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "white"}
                          >
                            <div style={{ fontWeight: 500, marginBottom: "0.25rem" }}>{group.name}</div>
                            <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                              {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                        )))}
                        <button
                          onClick={() => setShowGroupDropdown(false)}
                          style={{
                            width: "100%",
                            padding: "0.75rem",
                            background: "#f9fafb",
                            border: "none",
                            borderTop: "1px solid #e5e7eb",
                            cursor: "pointer",
                            fontWeight: 500,
                            color: "#6b7280",
                          }}
                        >
                          Cancel
                        </button>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Display Selected Group */}
              {selectedGroup && (
                <div style={{
                  marginTop: "1rem",
                  padding: "0.75rem 1rem",
                  background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
                  borderRadius: "0.75rem",
                  color: "white",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <div style={{ fontWeight: 600 }}>
                    {selectedGroup.name}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedGroup(null);
                      setParticipants([]);
                    }}
                    style={{
                      background: "rgba(255, 255, 255, 0.2)",
                      border: "none",
                      color: "white",
                      padding: "0.4rem 0.75rem",
                      borderRadius: "0.5rem",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)"}
                  >
                    Remove
                  </button>
                </div>
              )}

              {!selectedGroup && (
                <p className="text-gray-400 italic text-sm mt-4">
                  No group added yet.
                </p>
              )}

              {/* Display Participants with Payment Status */}
              {selectedGroup && participants.length > 0 && (
                <div style={{ marginTop: "1rem" }}>
                  <div style={{ fontWeight: 600, marginBottom: "0.75rem", fontSize: "0.95rem", color: "#374151" }}>
                    Participants ({participants.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {participants.map((participant) => (
                      <div
                        key={participant.id}
                        style={{
                          padding: "0.75rem",
                          background: "white",
                          border: "1px solid #e5e7eb",
                          borderRadius: "0.5rem",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "1rem",
                        }}
                      >
                        <div style={{ fontWeight: 500, color: "#1f2937", flex: 1 }}>{participant.name}</div>
                        
                        {/* Show Pay button for current user if status is PENDING */}
                        {participant.id === currentUserId && participant.paymentStatus === "PENDING" ? (
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch(`http://localhost:4000/pots/${potId}/members/${currentUserId}/payment-status`, {
                                  method: "PATCH",
                                  headers: getAuthHeaders(),
                                  body: JSON.stringify({ status: "PAID" }),
                                });
                                
                                if (res.ok) {
                                  window.dispatchEvent(new CustomEvent("pot:updated", { detail: { potId } }));
                                  setPopupData({
                                    title: "Payment Confirmed",
                                    message: "Your payment has been confirmed!",
                                  });
                                } else {
                                  const data = await res.json();
                                  setPopupData({
                                    title: "Error",
                                    message: data.error || "Failed to confirm payment",
                                  });
                                }
                              } catch (err) {
                                console.error("Failed to confirm payment:", err);
                                setPopupData({
                                  title: "Error",
                                  message: "Failed to confirm payment. Please try again.",
                                });
                              }
                            }}
                            style={{
                              padding: "0.5rem 1rem",
                              background: "#10b981",
                              color: "white",
                              border: "none",
                              borderRadius: "0.5rem",
                              cursor: "pointer",
                              fontWeight: 600,
                              fontSize: "0.85rem",
                              transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "#059669"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "#10b981"}
                          >
                            Confirm Payment
                          </button>
                        ) : (
                          <div
                            style={{
                              padding: "0.25rem 0.75rem",
                              borderRadius: "9999px",
                              fontSize: "0.8rem",
                              fontWeight: 600,
                              background: participant.paymentStatus === "PAID" ? "#d1fae5" : participant.paymentStatus === "DENIED" ? "#fee2e2" : "#fef3c7",
                              color: participant.paymentStatus === "PAID" ? "#065f46" : participant.paymentStatus === "DENIED" ? "#991b1b" : "#92400e",
                            }}
                          >
                            {participant.paymentStatus === "PAID" ? "✓ Paid" : participant.paymentStatus === "DENIED" ? "✗ Denied" : "⏱ Pending"}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="action-panel-modern text-center">
            {!splitStarted && !isComplete && potCreatorId === currentUserId && selectedGroup && (
              <button
                onClick={handleStartSplit}
                className="start-split-btn-modern mt-6"
              >
                Finalize & Start Split
              </button>
            )}

            {splitStarted && !isComplete && potStatus !== "FINALIZED" && (
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
