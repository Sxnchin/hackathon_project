import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../src/utils/authContext";

function Pots() {
  const { user, logout, readToken } = useAuth();
  const [pots, setPots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shareDrafts, setShareDrafts] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [collapsed, setCollapsed] = useState({ owned: false, participating: false });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPotName, setNewPotName] = useState("");

  const fetchPots = useCallback(async () => {
    if (!user) {
      setPots([]);
      setError("");
      setLoading(false);
      return;
    }

    const token = getStoredToken();
    if (!token) {
      setError("Missing session token. Please log in again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:4000/pots", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.status === 401) {
        logout();
        return;
      }
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to load your pots right now.");
      }
      setPots(Array.isArray(data.pots) ? data.pots : []);
    } catch (err) {
      setError(err.message || "Unable to load your pots right now.");
      setPots([]);
    } finally {
      setLoading(false);
    }
  }, [user, logout, getStoredToken]);

  useEffect(() => {
    fetchPots();
  }, [fetchPots]);

  useEffect(() => {
    const handleRefresh = () => fetchPots();
    window.addEventListener("pots:refresh", handleRefresh);
    return () => window.removeEventListener("pots:refresh", handleRefresh);
  }, [fetchPots]);

  useEffect(() => {
    if (!feedback) return undefined;
    const timer = setTimeout(() => setFeedback(null), 2500);
    return () => clearTimeout(timer);
  }, [feedback]);

  const ownedPots = useMemo(() => {
    const list = pots.filter((pot) => pot.role === "owner");
    return list.slice().sort(getComparator(sortOptions.owned));
  }, [pots, sortOptions.owned, getComparator]);

  const participatingPots = useMemo(() => {
    const list = pots.filter((pot) => pot.role !== "owner");
    return list.slice().sort(getComparator(sortOptions.participating));
  }, [pots, sortOptions.participating, getComparator]);

  const handleDraftChange = (potId, value) => {
    setShareDrafts((prev) => ({ ...prev, [potId]: value }));
  };

  const handleCreatePot = async () => {
    if (!newPotName.trim()) {
      setFeedback({ type: "error", message: "Pot name cannot be empty." });
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setFeedback({ type: "error", message: "Please log in to create a pot." });
      return;
    }

    try {
      const response = await fetch("http://localhost:4000/pots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newPotName.trim() }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to create pot.");
      }

      setFeedback({ type: "success", message: `Pot "${newPotName}" created successfully!` });
      setShowCreateModal(false);
      setNewPotName("");
      fetchPots();
    } catch (err) {
      setFeedback({ type: "error", message: err.message });
    }
  };

  const handleDeletePot = async (potId, potName) => {
    if (!user) {
      setFeedback({ type: "error", message: "Please log in to manage your pots." });
      return;
    }

    const token = getStoredToken();
    if (!token) {
      setFeedback({ type: "error", message: "Missing session token. Please log in again." });
      return;
    }

    const confirmation = window.confirm(
      `Delete "${potName}"? This removes the pot and its history permanently.`
    );
    if (!confirmation) return;

    try {
      const response = await fetch(`http://localhost:4000/pots/${potId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.status === 401) {
        logout();
        return;
      }
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Unable to delete pot.");
      }

      setFeedback({ type: "success", message: "Pot deleted." });
      await fetchPots();
      window.dispatchEvent(new Event("pots:refresh"));
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.message || "Unable to delete pot.",
      });
    }
  };

  const handleAddFunds = async (potId) => {
    const rawInput = shareDrafts[potId];
    const amount = Number(rawInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFeedback({ type: "error", message: "Enter a valid amount greater than zero." });
      return;
    }

    if (!user) {
      setFeedback({ type: "error", message: "Please log in to manage your pots." });
      return;
    }

    const token = getStoredToken();
    if (!token) {
      setFeedback({ type: "error", message: "Missing session token. Please log in again." });
      return;
    }

    try {
      const response = await fetch(`http://localhost:4000/pots/${potId}/members/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ delta: amount }),
      });
      if (response.status === 401) {
        logout();
        return;
      }
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to update your share for this pot.");
      }

      setShareDrafts((prev) => ({ ...prev, [potId]: "" }));
      setFeedback({ type: "success", message: "Funds added successfully." });
      await fetchPots();
      window.dispatchEvent(new Event("pots:refresh"));
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.message || "Unable to update your share for this pot.",
      });
    }
  };

  if (!user) {
    return (
      <div className="pots-page">
        <div className="pots-card">
          <h2>Please Log In</h2>
          <p>You need to log in to view and manage your pots.</p>
          <div className="pots-actions">
            <Link to="/login" className="get-started">
              Go to Login
            </Link>
            <Link to="/" className="back-link-modern">
              &larr; Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pots-page">
      <motion.div
        className="pots-header"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <div>
          <h1>Your Pots</h1>
          <p>View contributions, receipts, and adjust your share at any time.</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: "0.75rem 1.5rem",
            background: "#6366f1",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "1rem",
            fontWeight: "500",
            whiteSpace: "nowrap"
          }}
        >
          + Create New Pot
        </button>
      </motion.div>

      {feedback && (
        <div className={`pots-feedback ${feedback.type}`}>
          {feedback.message}
        </div>
      )}

      {error && (
        <div className="pots-error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="pots-loading">Loading your pots…</div>
      ) : ownedPots.length === 0 && participatingPots.length === 0 ? (
        <div className="pots-empty">
          <h3>No pots yet</h3>
          <p>Create a pot from the demo flow to get started.</p>
          <Link to="/demo" className="get-started">
            Go to Demo
          </Link>
        </div>
      ) : (
        <div className="pots-grid">
          {ownedPots.length > 0 && (
            <section className="pots-section">
              <div className="pots-section-header">
                <h2>Owned Pots</h2>
                <div className="pots-section-actions">
                  <div className="pots-sort">
                    <label htmlFor="owned-sort">Sort by</label>
                    <select
                      id="owned-sort"
                      value={sortOptions.owned}
                      onChange={(e) =>
                        setSortOptions((prev) => ({
                          ...prev,
                          owned: e.target.value,
                        }))
                      }
                    >
                      <option value="latest">Latest</option>
                      <option value="largest">Largest Pot</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    className="pots-toggle-btn"
                    onClick={() =>
                      setCollapsed((prev) => ({ ...prev, owned: !prev.owned }))
                    }
                  >
                    {collapsed.owned ? "Expand" : "Collapse"}
                  </button>
                </div>
              </div>
              {!collapsed.owned && (
                <div className="pots-list">
                  {ownedPots.map((pot) => (
                  <motion.div
                    key={pot.id}
                    className="pot-card"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <header className="pot-card-header">
                      <div className="pot-card-heading">
                        <h3>{pot.name}</h3>
                        <span className="pot-total">
                          Total: ${Number(pot.totalAmount || 0).toFixed(2)}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="pot-delete-btn"
                        onClick={() => handleDeletePot(pot.id, pot.name)}
                      >
                        Delete
                      </button>
                    </header>
                    <div className="pot-meta">
                      <div>
                        <strong>Your Share:</strong>{" "}
                        ${Number(pot.userShare || 0).toFixed(2)}
                      </div>
                      <div>
                        <strong>Receipts:</strong> {pot.receipts?.length || 0}
                      </div>
                    </div>
                    <div className="pot-members">
                      <h4>Members</h4>
                      <ul>
                        {pot.members.map((member) => (
                          <li key={member.id}>
                            <span>{member.user?.name || "Member"}</span>
                            <span>${Number(member.share || 0).toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="pot-share-editor">
                      <label htmlFor={`share-${pot.id}`}>
                        Adjust your share
                      </label>
                      <input
                        id={`share-${pot.id}`}
                        type="number"
                        value={shareDrafts[pot.id] ?? ""}
                        onChange={(e) => handleDraftChange(pot.id, e.target.value)}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                      />
                      <div className="pot-share-actions">
                        <motion.button
                          type="button"
                          className="get-started"
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleAddFunds(pot.id)}
                        >
                          Add Funds
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
                </div>
              )}
            </section>
          )}

          {participatingPots.length > 0 && (
            <section className="pots-section">
              <div className="pots-section-header">
                <h2>Participating Pots</h2>
                <div className="pots-section-actions">
                  <div className="pots-sort">
                    <label htmlFor="participating-sort">Sort by</label>
                    <select
                      id="participating-sort"
                      value={sortOptions.participating}
                      onChange={(e) =>
                        setSortOptions((prev) => ({
                          ...prev,
                          participating: e.target.value,
                        }))
                      }
                    >
                      <option value="latest">Latest</option>
                      <option value="largest">Largest Pot</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    className="pots-toggle-btn"
                    onClick={() =>
                      setCollapsed((prev) => ({
                        ...prev,
                        participating: !prev.participating,
                      }))
                    }
                  >
                    {collapsed.participating ? "Expand" : "Collapse"}
                  </button>
                </div>
              </div>
              {!collapsed.participating && (
                <div className="pots-list">
                  {participatingPots.map((pot) => (
                  <motion.div
                    key={pot.id}
                    className="pot-card"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <header className="pot-card-header">
                      <h3>{pot.name}</h3>
                      <span className="pot-total">
                        Total: ${Number(pot.totalAmount || 0).toFixed(2)}
                      </span>
                    </header>
                    <div className="pot-meta">
                      <div>
                        <strong>Your Share:</strong>{" "}
                        ${Number(pot.userShare || 0).toFixed(2)}
                      </div>
                      <div>
                        <strong>Receipts:</strong> {pot.receipts?.length || 0}
                      </div>
                    </div>
                    <div className="pot-members">
                      <h4>Members</h4>
                      <ul>
                        {pot.members.map((member) => (
                          <li key={member.id}>
                            <span>{member.user?.name || "Member"}</span>
                            <span>${Number(member.share || 0).toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="pot-share-editor">
                      <label htmlFor={`share-${pot.id}`}>
                        Adjust your share
                      </label>
                      <input
                        id={`share-${pot.id}`}
                        type="number"
                        value={shareDrafts[pot.id] ?? ""}
                        onChange={(e) => handleDraftChange(pot.id, e.target.value)}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                      />
                      <div className="pot-share-actions">
                        <motion.button
                          type="button"
                          className="get-started"
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleAddFunds(pot.id)}
                        >
                          Add Funds
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {/* Create Pot Modal */}
      {showCreateModal && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div 
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "2rem",
              maxWidth: "400px",
              width: "90%",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Create New Pot</h2>
            <p style={{ marginBottom: "1rem", color: "#666" }}>
              Give your pot a name to get started.
            </p>
            <input
              type="text"
              placeholder="Enter pot name (e.g., 'Trip to Paris')"
              value={newPotName}
              onChange={(e) => setNewPotName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleCreatePot()}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: "1rem",
                marginBottom: "1.5rem"
              }}
              autoFocus
            />
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button 
                onClick={() => setShowCreateModal(false)}
                style={{
                  padding: "0.6rem 1.25rem",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  background: "white",
                  cursor: "pointer",
                  fontSize: "0.95rem"
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleCreatePot}
                style={{
                  padding: "0.6rem 1.25rem",
                  border: "none",
                  borderRadius: "8px",
                  background: "#6366f1",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "0.95rem",
                  fontWeight: "500"
                }}
              >
                Create Pot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Pots;
