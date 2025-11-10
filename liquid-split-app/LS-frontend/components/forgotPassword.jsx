import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { validatePassword } from "../../shared/passwordValidation";
import PasswordStrengthIndicator from "./PasswordStrengthIndicator";
import "../src/styles/auth.css";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const navigate = useNavigate();

  // Update password strength in real-time
  useEffect(() => {
    if (newPassword) {
      const validation = validatePassword(newPassword);
      setPasswordStrength(validation);
    } else {
      setPasswordStrength({ score: 0, feedback: [] });
    }
  }, [newPassword]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validate new password
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      setError(validation.feedback.join(", ").replace(/Need /g, "Password must have "));
      return;
    }

    // Check if new passwords match
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    // Check if new password is different from current
    if (currentPassword === newPassword) {
      setError("New password must be different from current password");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("http://localhost:4000/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password. Please try again.");
      }

      setSuccess("✅ Password reset successfully! Redirecting to login...");
      
      // Clear fields
      setEmail("");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/login");
      }, 2000);

    } catch (err) {
      console.error("❌ Password reset error:", err.message);
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
          <h2 className="text-3xl font-bold text-gray-800">Reset Password</h2>
          <p className="text-gray-500 mt-2">
            Enter your email and current password to reset your password.
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

          <label htmlFor="currentPassword">Current Password</label>
          <input
            type="password"
            id="currentPassword"
            placeholder="Enter your current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />

          <label htmlFor="newPassword">New Password</label>
          <input
            type="password"
            id="newPassword"
            placeholder="Enter your new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          {newPassword && (
            <PasswordStrengthIndicator 
              strength={passwordStrength.score}
              feedback={passwordStrength.feedback}
            />
          )}

          <label htmlFor="confirmPassword">Confirm New Password</label>
          <input
            type="password"
            id="confirmPassword"
            placeholder="Confirm your new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          {error && (
            <motion.p
              className="login-error-modern"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {error}
            </motion.p>
          )}

          {success && (
            <motion.p
              className="login-success-modern"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {success}
            </motion.p>
          )}

          <motion.button
            type="submit"
            className="login-btn-modern"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.05 }}
            whileTap={{ scale: loading ? 1 : 0.97 }}
          >
            {loading ? "Resetting..." : "Reset Password"}
          </motion.button>
        </form>

        <div
          style={{
            display: "flex",
            gap: "1rem",
            justifyContent: "center",
            marginTop: "2rem",
            flexWrap: "wrap",
          }}
        >
          <Link to="/login" className="back-link-modern">
            Back to Login
          </Link>
          <Link to="/get-started" className="back-link-modern">
            Create Account
          </Link>
          <Link to="/" className="back-link-modern">
            &larr; Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default ForgotPassword;
