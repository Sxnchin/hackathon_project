import React from "react";
import "./App.css";
import { motion } from "framer-motion";

function App() {
  // Reusable animation variants
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
        className="navbar"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="nav-logo">LiquidSplit</div>
        <div className="nav-links">
          <a href="#how-it-works">How It Works</a>
          <a href="#features">Features</a>
          <a href="#contact" className="get-started">
            Get Started
          </a>
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
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            className="cta-btn"
          >
            Try the Demo
          </motion.button>
        </motion.div>
      </section>

      {/* How It Works */}
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
          <motion.div
            className="card"
            variants={slideLeft}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <h3>1. Checkout Anywhere</h3>
            <p>
              Pay through LiquidSplit directly at any online checkout — no app
              switching, no waiting.
            </p>
          </motion.div>

          <motion.div
            className="card"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <h3>2. Invite Friends</h3>
            <p>
              Instantly invite your friends to join the purchase and claim their
              share.
            </p>
          </motion.div>

          <motion.div
            className="card"
            variants={slideRight}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <h3>3. Everyone Owns</h3>
            <p>
              Everyone gets a verified digital receipt showing exactly what
              they own.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="features">
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          Why LiquidSplit
        </motion.h2>

        <div className="feature-grid">
          {[
            {
              title: "⚡ Real-Time Splitting",
              desc: "Split any payment at checkout instantly.",
            },
            {
              title: "🔐 Secure by Design",
              desc: "Built on encrypted payment flows with verified transactions.",
            },
            {
              title: "🪪 Digital Receipts",
              desc: "Transparent co-ownership records for everyone involved.",
            },
          ].map((feature, i) => (
            <motion.div
              key={i}
              className="feature-box"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                delay: i * 0.2,
                type: "spring",
                stiffness: 70,
                damping: 12,
              }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.05 }}
            >
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <motion.footer
        className="footer"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <p>© 2025 LiquidSplit — Built for the Hackathon.</p>
      </motion.footer>
    </div>
  );
}

export default App;
