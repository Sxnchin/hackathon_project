// src/pages/Home.jsx
import React from "react";
import { motion } from "framer-motion";
import "../src/app.css";

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
        className="navbar"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="nav-logo">LiquidSplit</div>
        <div className="nav-links">
          <a href="#how-it-works">How It Works</a>
          <a href="#features">Features</a>
          <a href="/get-started" className="get-started">
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
          <motion.a
            href="/get-started"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            className="cta-btn"
          >
            Try the Demo
          </motion.a>
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

export default Home;
