import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import "../src/App.css";
import { useAuth } from "../src/utils/authContext";

function Profile() {
  const { user, login } = useAuth();
  const [balance, setBalance] = useState(user?.balance || 0);
  // Fetch latest balance from backend
  useEffect(() => {
    async function fetchBalance() {
      if (!user?.email) return;
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
  }, [user, user?.email]);
  const [input, setInput] = useState("");
  const [showNotif, setShowNotif] = useState(false);
  

  const handleSetBalance = async (e) => {
    e.preventDefault();
    if (!input || isNaN(input)) return;
  // setBalance(Number(input));
    setShowNotif(true);
    // Demo: Add user to DB with balance
    try {
      const res = await fetch("http://localhost:4000/auth/set-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("liquidSplitToken")}` },
        body: JSON.stringify({ email: user.email, name: user.name, balance: Number(input) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save');
      // update context with new user
      login(localStorage.getItem('liquidSplitToken'), data.user);
      // Optionally update localStorage
      localStorage.setItem("liquidSplitUser", JSON.stringify({ ...user, balance: Number(input) }));
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
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
          <Link to="/demo" className="back-link-modern">Go to Demo</Link>
          <Link to="/" className="back-link-modern">&larr; Back to Home</Link>
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
