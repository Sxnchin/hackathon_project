import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../src/utils/authContext";
import "../src/styles/auth.css";
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

  // Dummy handler for social logins
  const handleSocialLogin = (provider) => {
    try {
      const backendFromWindow = (typeof window !== 'undefined' && window.__BACKEND_URL__) || null;
      const backendFromVite = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BACKEND_URL ? import.meta.env.VITE_BACKEND_URL : null;
      const backend = backendFromWindow || backendFromVite || 'http://localhost:4000';
      console.log('[Login] social login clicked', provider, backend);
      if (provider === 'Google') {
        const url = `${backend.replace(/\/$/, '')}/auth/google`;
        window.location.assign(url);
        return;
      }
      alert(`${provider} login is not set up yet!`);
    } catch (err) {
      console.error('Error starting social login', err);
      alert('Could not start social login. Check console for details.');
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

        {/* --- 1. ADD THE MAIN GRID WRAPPER --- */}
        <div className="login-body-grid">
          
          {/* --- 2. ADD THE SOCIAL LOGIN COLUMN (COL 1) --- */}
          <div className="social-login-container">
            <button
              type="button"
              className="social-login-btn google"
              onClick={() => handleSocialLogin('Google')}
              disabled={loading || isInCooldown}
            >
              {/* Google G Logo SVG */}
              <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true" style={{ verticalAlign: 'middle' }}>
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.49-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                <path fill="none" d="M0 0h48v48H0z"></path>
              </svg>
              Log In with Google
            </button>

            <button
              type="button"
              className="social-login-btn github"
              onClick={() => handleSocialLogin('GitHub')}
              disabled={loading || isInCooldown}
            >
              {/* GitHub Logo SVG */}
              <svg viewBox="0 0 16 16" width="20" height="20" fill="currentColor" aria-hidden="true" style={{ verticalAlign: 'middle' }}>
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.23.48-2.7-1.07-2.7-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.8.06 1.23.82 1.23.82.72 1.22 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.19 0 .21.15.46.55.38C13.71 14.53 16 11.53 16 8c0-4.42-3.58-8-8-8z"></path>
              </svg>
              Log In with GitHub
            </button>
          </div>

          {/* --- 3. ADD THE 'OR' DIVIDER (COL 2) --- */}
          <div className="login-divider">
            <span>OR</span>
          </div>
          
          {/* --- 4. MOVE YOUR FORM INTO THE EMAIL COLUMN (COL 3) --- */}
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

        </div> {/* --- End of login-body-grid --- */}


        <div
          style={{
            display: "flex",
            gap: "1rem",
            justifyContent: "center",
            marginTop: "2rem",
            flexWrap: "wrap",
          }}
        >
          <Link to="/get-started" className="back-link-modern">
            Don't have an account? Sign Up
          </Link>
          <Link to="/forgot-password" className="back-link-modern">
            Forgot Password?
          </Link>
          <Link to="/" className="back-link-modern">
            &larr; Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default Login;
