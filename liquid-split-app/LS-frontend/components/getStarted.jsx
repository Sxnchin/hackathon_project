import React, { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../src/utils/authContext";

function GetStarted() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:4000/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: username,
          email,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed. Please try again.");
      }

      // ✅ Save JWT token locally (so pots and demo can access it)
      if (data.token) {
        localStorage.setItem("token", data.token);
      }

      // ✅ Update global auth context (for navbar, etc.)
      login(data.token, data.user);

      alert(`✅ Welcome ${data.user.name}! Your account has been created.`);
      navigate("/profile");

      // Clear fields
      setEmail("");
      setUsername("");
      setPassword("");
    } catch (err) {
      console.error("❌ Registration error:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-demo-bg">
      <motion.div
        className="signup-card-modern"
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="signup-header">
          <h2 className="text-3xl font-bold text-gray-800">
            Create Your Account
          </h2>
          <p className="text-gray-500 mt-2">
            Join <span className="brand-name">LiquidSplit</span> and simplify
            shared purchases.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="signup-form-modern">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            placeholder="Your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <motion.button
            type="submit"
            className="signup-btn-modern"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.05 }}
            whileTap={{ scale: loading ? 1 : 0.97 }}
          >
            {loading ? "Creating..." : "Sign Up"}
          </motion.button>

          {error && (
            <motion.p
              className="signup-error-modern"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {error}
            </motion.p>
          )}
        </form>

        <p className="text-center mt-10 text-gray-600">
          Already have an account?{" "}
          <Link to="/login" className="text-indigo-600 hover:underline">
            Log In
          </Link>
        </p>

        <Link to="/" className="back-link-modern">
          &larr; Back to Home
        </Link>
      </motion.div>
    </div>
  );
}

export default GetStarted;