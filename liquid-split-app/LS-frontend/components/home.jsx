import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import "../src/App.css";

function Home() {
  const fadeUp = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80 } },
  };

  const slideLeft = {
    hidden: { opacity: 0, x: -80 },
    visible: { opacity: 1, x: 0, transition: { type: "spring", bounce: 0.4 } },
  };

  const slideRight = {
    hidden: { opacity: 0, x: 80 },
    visible: { opacity: 1, x: 0, transition: { type: "spring", bounce: 0.4 } },
  };

  return (
    <div className="app-container">
      {/* Navbar */}
      <motion.nav
        className="navbar" // ✅ FIX: Added the className to apply flexbox styles
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 90, delay: 0.2 }}
      >
        <div className="nav-logo">LiquidSplit</div>
        {/* ✅ FIX: Consolidated all links into one container for proper alignment */}
        <div className="nav-links">
          <a href="#how-it-works">How It Works</a>
          <a href="#features">Features</a>
          <Link to="/get-started" className="get-started">
            Get Started
          </Link>
          <Link to="/login" className="get-started">
            Login
          </Link>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="hero">
        <motion.div
          className="hero-content"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          <h1>Split purchases, not friendships.</h1>
          <p>
            The easiest way to co-own anything with friends. Split payments in
            real time — powered by LiquidSplit.
          </p>
          <Link to="/demo" className="cta-btn">
            Try the Demo
          </Link>
        </motion.div>
      </section>

      {/* Features Section */}
<section id="features" className="features-section">
  <h2>Powerful Features, Seamless Experience</h2>
  <p className="features-subtitle">
    Everything you need to split payments and co-own purchases with zero friction.
  </p>

  <div className="feature-grid">
    <div className="feature-card">
      <img src="/icons/secure.svg" alt="Secure Payments" className="feature-icon" />
      <h3>Secure Payments</h3>
      <p>Protected by end-to-end encryption to keep every transaction private.</p>
    </div>

    <div className="feature-card">
      <img src="/icons/instant.svg" alt="Instant Splitting" className="feature-icon" />
      <h3>Instant Splitting</h3>
      <p>Divide payments in real-time — no delays or awkward calculations.</p>
    </div>

    <div className="feature-card">
      <img src="/icons/receipt.svg" alt="Digital Receipts" className="feature-icon" />
      <h3>Verified Receipts</h3>
      <p>Each user receives a blockchain-backed digital receipt proving ownership.</p>
    </div>
  </div>
</section>

      

      {/* How It Works Section */}
      <section id="how-it-works" className="how-section">
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          How It Works
        </motion.h2>
        <div className="cards">
          <motion.div className="card" variants={slideLeft} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h3>1. Checkout Anywhere</h3>
            <p>Pay through LiquidSplit directly at any online checkout — no app switching, no waiting.</p>
          </motion.div>
          <motion.div className="card" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h3>2. Invite Friends</h3>
            <p>Instantly invite your friends to join the purchase and claim their share.</p>
          </motion.div>
          <motion.div className="card" variants={slideRight} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h3>3. Everyone Owns</h3>
            <p>Everyone gets a verified digital receipt showing exactly what they own.</p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <motion.footer className="footer" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 1 }}>
        <p>© 2025 LiquidSplit — Built for the Hackathon.</p>
      </motion.footer>
    </div>
  );
}

export default Home;