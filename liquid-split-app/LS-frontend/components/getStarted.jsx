import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../src/utils/authContext";

import { validatePassword } from "../../shared/passwordValidation";
import PasswordStrengthIndicator from "./PasswordStrengthIndicator";
import "./auth.css";

function GetStarted() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { login } = useAuth();

  // Basic client-side validation
  const validatePasswordClient = (password) => {
    if (password.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (!/[A-Z]/.test(password)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/\d/.test(password)) {
      return "Password must contain at least one number";
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return "Password must contain at least one special character (!@#$%^&*...)";
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Client-side validation
    const passwordError = validatePasswordClient(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);

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
          {/* <ul>
            <li className="passwordChecker">Password must be at least 8 characters long</li>
            <li className="passwordChecker">Password must contain at least one uppercase letter</li>
            <li className="passwordChecker">Password must contain at least one number</li>
            <li className="passwordChecker">Password must contain at least one special character (!@#$%^&*...)</li>
          </ul> */}

          <motion.button
            type="submit"
            className="signup-btn-modern"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.05 }}
            whileTap={{ scale: loading ? 1 : 0.97 }}
          >
            {loading ? "Creating..." : "Sign Up"}
          </motion.button>
<div className="mt-6">
  <p className="text-center text-gray-500 mb-3">Or continue with</p>
  <div className="flex justify-center gap-4">
    <button
      type="button"
      className="p-3 bg-white border rounded-full shadow-sm hover:shadow-md transition"
      onClick={() => alert("Continue with Facebook (to be implemented)")}
    >
      <i className="fab fa-facebook-f text-blue-600"></i>
    </button>
    <button
      type="button"
      className="p-3 bg-white border rounded-full shadow-sm hover:shadow-md transition"
      onClick={() => alert("Continue with Google (to be implemented)")}
    >
      <i className="fab fa-google text-red-500"></i>
    </button>
    <button
      type="button"
      className="p-3 bg-white border rounded-full shadow-sm hover:shadow-md transition"
      onClick={() => alert("Continue with GitHub (to be implemented)")}
    >
      <i className="fab fa-github text-gray-800"></i>
    </button>
  </div>
</div>

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
