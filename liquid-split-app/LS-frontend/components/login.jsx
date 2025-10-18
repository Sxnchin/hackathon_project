import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";

const LoggedInCard = () => {
    const user = JSON.parse(localStorage.getItem('liquidSplitUser'));
    return (
        <motion.div
            className="get-started-card"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
            <h2 className="text-3xl font-bold text-gray-800 text-center">Login Successful!</h2>
            <p className="text-gray-500 text-center mt-2">
                Welcome back, <span className="font-bold">{user ? user.name : 'User'}</span>!
            </p>
            <div className="mt-8 flex flex-col items-center gap-4">
                <Link to="/demo" className="cta-btn w-full text-center" style={{ textDecoration: 'none' }}>
                    Proceed to Demo
                </Link>
            </div>
        </motion.div>
    );
};

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:4000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed. Please try again.");
      }

      localStorage.setItem("liquidSplitToken", data.token);
      localStorage.setItem("liquidSplitUser", JSON.stringify(data.user));

      alert(`✅ Welcome back, ${data.user.name}!`);
      navigate("/");
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
            Log in to continue to <span className="brand-name">LiquidSplit</span>.
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
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.05 }}
            whileTap={{ scale: loading ? 1 : 0.97 }}
          >
            {loading ? "Logging in..." : "Log In"}
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
        </form>

        <p className="text-center mt-6 text-gray-600">
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