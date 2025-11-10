import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../src/utils/authContext";

import { validatePassword } from "../../shared/passwordValidation";
import PasswordStrengthIndicator from "./PasswordStrengthIndicator";
import "../src/styles/auth.css";

function GetStarted() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { login } = useAuth();

  // Update password strength in real-time
  useEffect(() => {
    if (password) {
      const validation = validatePassword(password);
      setPasswordStrength(validation);
    } else {
      setPasswordStrength({ score: 0, feedback: [] });
    }
  }, [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Client-side validation
    const validation = validatePassword(password);
    if (!validation.isValid) {
      setError(validation.feedback.join(", ").replace(/Need /g, "Password must have "));
      return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
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
      setConfirmPassword("");
    } catch (err) {
      console.error("❌ Registration error:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Dummy handler for social signups (keeps parity with Login component)
  const handleSocialLogin = (provider) => {
    try {
      // Prefer an injected global or Vite env var (import.meta.env) in the frontend.
      const backendFromWindow = (typeof window !== 'undefined' && window.__BACKEND_URL__) || null;
      const backendFromVite = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BACKEND_URL ? import.meta.env.VITE_BACKEND_URL : null;
      const backend = backendFromWindow || backendFromVite || 'http://localhost:4000';
      console.log('[GetStarted] social login clicked', provider, backend);
      if (provider === 'Google') {
        const url = `${backend.replace(/\/$/, '')}/auth/google`;
        // Use assign to force navigation (works consistently across browsers)
        window.location.assign(url);
        return;
      }
      // Fallback for providers not implemented yet
      alert(`${provider} signup is not set up yet!`);
    } catch (err) {
      console.error('Error starting social login', err);
      alert('Could not start social login. Check console for details.');
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
          
          {password && (
            <PasswordStrengthIndicator 
              score={passwordStrength.score} 
              feedback={passwordStrength.feedback} 
            />
          )}

          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            type="password"
            id="confirmPassword"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
        <div className="mt-6">
          <p className="text-center text-gray-500 mb-3">Or continue with</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="social-login-btn google"
              onClick={() => handleSocialLogin('Google')}
              disabled={loading}
            >
              <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true" style={{ verticalAlign: 'middle' }}>
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.49-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                <path fill="none" d="M0 0h48v48H0z"></path>
              </svg>
              Sign up with Google
            </button>

            <button
              type="button"
              className="social-login-btn github"
              onClick={() => handleSocialLogin('GitHub')}
              disabled={loading}
            >
              <svg viewBox="0 0 16 16" width="20" height="20" fill="currentColor" aria-hidden="true" style={{ verticalAlign: 'middle' }}>
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.23.48-2.7-1.07-2.7-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.8.06 1.23.82 1.23.82.72 1.22 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.19 0 .21.15.46.55.38C13.71 14.53 16 11.53 16 8c0-4.42-3.58-8-8-8z"></path>
              </svg>
              Sign up with GitHub
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
