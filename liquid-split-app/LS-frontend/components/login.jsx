import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../src/utils/authContext";

// Login attempt tracking constants
const MAX_LOGIN_ATTEMPTS = 5;
const COOLDOWN_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEY_ATTEMPTS = 'loginAttempts';
const STORAGE_KEY_FINGERPRINT = 'browserFingerprint';
const STORAGE_KEY_COOLDOWN = 'loginCooldownUntil';

// Generate a browser fingerprint to track attempts even if localStorage is cleared
const generateFingerprint = () => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('fingerprint', 2, 2);
  
  const fingerprint = {
    canvas: canvas.toDataURL(),
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    cores: navigator.hardwareConcurrency || 'unknown'
  };
  
  // Create a hash-like string from the fingerprint
  return btoa(JSON.stringify(fingerprint)).substring(0, 32);
};

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isInCooldown, setIsInCooldown] = useState(false);
  const [cooldownTimeRemaining, setCooldownTimeRemaining] = useState(0);

  const navigate = useNavigate();
  const { login } = useAuth();
  const location = useLocation();

  // If user came from a protected page like /demo, go back there after login
  const from = location.state?.from?.pathname || "/demo";

  // Initialize fingerprint and check attempts on mount
  useEffect(() => {
    let fingerprint = localStorage.getItem(STORAGE_KEY_FINGERPRINT);
    if (!fingerprint) {
      fingerprint = generateFingerprint();
      localStorage.setItem(STORAGE_KEY_FINGERPRINT, fingerprint);
    }
    
    // Load current failed attempts
    const attempts = parseInt(localStorage.getItem(STORAGE_KEY_ATTEMPTS) || '0', 10);
    setFailedAttempts(attempts);

    // Check cooldown status
    checkCooldownStatus();
    
    // Update cooldown timer every second
    const interval = setInterval(() => {
      checkCooldownStatus();
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const checkCooldownStatus = () => {
    const cooldownUntil = localStorage.getItem(STORAGE_KEY_COOLDOWN);
    if (cooldownUntil) {
      const cooldownTime = parseInt(cooldownUntil, 10);
      const now = Date.now();
      
      if (now < cooldownTime) {
        setIsInCooldown(true);
        setCooldownTimeRemaining(Math.ceil((cooldownTime - now) / 1000));
      } else {
        // Cooldown expired, clear it
        clearCooldown();
      }
    }
  };

  const clearCooldown = () => {
    localStorage.removeItem(STORAGE_KEY_ATTEMPTS);
    localStorage.removeItem(STORAGE_KEY_COOLDOWN);
    setIsInCooldown(false);
    setCooldownTimeRemaining(0);
    setFailedAttempts(0);
  };

  const incrementFailedAttempts = () => {
    const currentAttempts = parseInt(localStorage.getItem(STORAGE_KEY_ATTEMPTS) || '0', 10);
    const newAttempts = currentAttempts + 1;
    localStorage.setItem(STORAGE_KEY_ATTEMPTS, newAttempts.toString());
    setFailedAttempts(newAttempts);
    
    // If reached max attempts, start cooldown
    if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
      const cooldownUntil = Date.now() + COOLDOWN_DURATION_MS;
      localStorage.setItem(STORAGE_KEY_COOLDOWN, cooldownUntil.toString());
      setIsInCooldown(true);
      setCooldownTimeRemaining(COOLDOWN_DURATION_MS / 1000);
    }
    
    return newAttempts;
  };

  const formatTimeRemaining = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Check if user is in cooldown
    if (isInCooldown) {
      setError(`Too many failed login attempts. Please try again in ${formatTimeRemaining(cooldownTimeRemaining)}.`);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:4000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Failed login attempt
        const attempts = incrementFailedAttempts();
        
        if (attempts >= MAX_LOGIN_ATTEMPTS) {
          throw new Error("You have reached the maximum number of login attempts. Please wait 5 minutes.");
        } else {
          const remainingAttempts = MAX_LOGIN_ATTEMPTS - attempts;
          throw new Error(
            `${data.error || "Login failed. Please try again."} (${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining)`
          );
        }
      }

      // ✅ Successful login - clear any failed attempts and cooldown
      clearCooldown();

      // ✅ Save token to localStorage for protected routes (pots, demo, etc.)
      if (data.token) {
        localStorage.setItem("token", data.token);
      }

      // ✅ Update auth context so navbar reflects login state
      login(data.token, data.user);

      alert(`✅ Welcome back, ${data.user.name}!`);
      navigate(from, { replace: true });
    } catch (err) {
      console.error("Login error:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
          <h2 className="text-3xl font-bold text-gray-800">Welcome Back</h2>
          <p className="text-gray-500 mt-2">
            Log in to continue to{" "}
            <span className="brand-name">LiquidSplit</span>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form-modern">
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
            className="login-btn-modern"
            disabled={loading || isInCooldown}
            whileHover={{ scale: (loading || isInCooldown) ? 1 : 1.05 }}
            whileTap={{ scale: (loading || isInCooldown) ? 1 : 0.97 }}
            style={{ 
              opacity: isInCooldown ? 0.5 : 1,
              cursor: isInCooldown ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? "Logging in..." : isInCooldown ? `Locked (${formatTimeRemaining(cooldownTimeRemaining)})` : "Log In"}
          </motion.button>

          {error && (
            <motion.p
              className="login-error-modern"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {error}
            </motion.p>
          )}

          {isInCooldown && !error && (
            <motion.p
              className="login-error-modern"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ color: '#ff6b6b' }}
            >
              🔒 Too many failed attempts. Try again in {formatTimeRemaining(cooldownTimeRemaining)}.
            </motion.p>
          )}
        </form>

        <p className="text-center mt-10 text-gray-600">
          Don’t have an account?{" "}
          <Link to="/get-started" className="login-link">
            Sign Up
          </Link>
        </p>

        <Link to="/" className="back-link-modern">
          &larr; Back to Home
        </Link>
      </motion.div>
    </div>
  );
}

export default Login;