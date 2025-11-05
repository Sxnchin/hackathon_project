  // Handler for Plaid connect (demo: just alert or link)
  const handleConnectPlaid = () => {
    // Replace with Plaid Link logic or redirect as needed
    alert('Plaid connection flow would start here.');
  };
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import "./profile.css";
import { useAuth } from "../src/utils/authContext";

function Profile() {
  const { user, login, logout } = useAuth();
  const isAuthenticated = Boolean(user?.email);
  const [balance, setBalance] = useState(user?.balance || 0);
  // Fetch latest balance from backend
  useEffect(() => {
    async function fetchBalance() {
      if (!isAuthenticated) return;
      try {
        const res = await fetch(`http://localhost:4000/auth/users`);
        const data = await res.json();
        if (res.ok && Array.isArray(data.users)) {
          const found = data.users.find(u => u.email === user.email);
          if (found) setBalance(found.balance);
        }
      } catch {}
    }
    fetchBalance();
  }, [isAuthenticated, user?.email]);
  const [input, setInput] = useState("");
  const [showNotif, setShowNotif] = useState(false);
  

  const handleSetBalance = async (e) => {
    e.preventDefault();
    if (!isAuthenticated || !user?.name) {
      alert('Please sign in to update your balance.');
      return;
    }
    const amount = Number(input);
    if (!Number.isFinite(amount) || amount <= 0) return;
    const currentBalance = Number(balance) || 0;
    const updatedBalance = currentBalance + amount;
    setShowNotif(true);
    // Demo: Add user to DB with balance
    try {
      const res = await fetch("http://localhost:4000/auth/set-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("liquidSplitToken")}` },
        body: JSON.stringify({ email: user.email, name: user.name, balance: updatedBalance })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save');
      // update context with new user
      login(localStorage.getItem('liquidSplitToken'), data.user);
      // Optionally update localStorage
      localStorage.setItem("liquidSplitUser", JSON.stringify({ ...user, balance: data.user?.balance ?? updatedBalance }));
      setBalance(data.user?.balance ?? updatedBalance);
      setInput("");
      // fetch updated balance from backend
      setTimeout(() => {
        fetch(`http://localhost:4000/auth/users`)
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data.users)) {
              const found = data.users.find(u => u.email === user.email);
              if (found) setBalance(found.balance);
            }
          });
      }, 500);
    } catch (err) {
      // Handle error
    }
    setTimeout(() => setShowNotif(false), 2000);
  };

  // Handler for Stripe Connect onboarding
  const handleConnectStripe = async () => {
    if (!user?.id) return alert('User not found. Please log in.');
    try {
      const res = await fetch('http://localhost:4000/stripe/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.open(data.url, '_blank', 'noopener');
      } else {
        alert(data.error || 'Could not start Stripe onboarding');
      }
    } catch (err) {
      alert('Error connecting to Stripe.');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="login-demo-bg">
        <motion.div
          className="login-card-modern"
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="login-header">
            <h2 className="text-3xl font-bold text-gray-800">Login Required</h2>
            <p className="text-gray-500 mt-2">Sign in to manage your demo balance.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
            <Link to="/login" className="login-btn-modern" style={{ textAlign: 'center' }}>
              Go to Login
            </Link>
            <Link to="/" className="back-link-modern">&larr; Back to Home</Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="login-demo-bg">
      <motion.div
        className="login-card-modern"
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="login-header">
          <h2 className="text-3xl font-bold text-gray-800">Profile</h2>
          <p className="text-gray-500 mt-2">Set your demo balance below.</p>
        </div>
        <form onSubmit={handleSetBalance} className="login-form-modern">
          <label htmlFor="balance">Balance</label>
          <input
            type="number"
            id="balance"
            placeholder="Enter balance"
            value={input}
            onChange={e => setInput(e.target.value)}
            required
          />
          <motion.button
            type="submit"
            className="login-btn-modern"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
          >
            Set Balance
          </motion.button>
        </form>
        <div style={{marginTop: "1rem", fontWeight: "bold"}}>Current Balance: ${balance}</div>
        {user && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.75rem",
              marginTop: "1rem",
            }}
          >
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
              <motion.button
                className="login-btn-modern"
                style={{ background: "#2563eb" }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleConnectPlaid}
              >
                Connect Plaid
              </motion.button>
              <motion.button
                className="login-btn-modern"
                style={{ background: "#635bff" }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleConnectStripe}
              >
                Connect Stripe
              </motion.button>
            </div>
            <motion.button
              type="button"
              className="login-btn-modern"
              style={{ background: "#ef4444" }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                logout();
                localStorage.removeItem("token");
              }}
            >
              Sign Out
            </motion.button>
          </div>
        )}
        <div
          style={{
            display: "flex",
            gap: "1rem",
            justifyContent: "center",
            marginTop: "1rem",
            flexWrap: "wrap",
          }}
        >
          <Link to="/demo" className="back-link-modern">
            Go to Demo
          </Link>
          <Link to="/" className="back-link-modern">
            &larr; Back to Home
          </Link>
        </div>
        {showNotif && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="notif-green"
            style={{
              position: "absolute",
              top: 30,
              right: 30,
              background: "#22c55e",
              color: "white",
              padding: "0.75rem 1.5rem",
              borderRadius: "1rem",
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
              zIndex: 1000,
              fontWeight: "bold"
            }}
          >
            Balance updated!
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

export default Profile;
