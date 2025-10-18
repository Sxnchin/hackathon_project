import React from "react"; // No longer need useState here
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import "../src/app.css";

// Demo component is no longer imported here as it's a separate page

function Home() {
  // The activeModal state is no longer needed

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
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 90, delay: 0.2 }}
      >
        <div className="nav-logo">LiquidSplit</div>
        <div className="nav-links">
          <a href="#how-it-works">How It Works</a>
          <a href="#features">Features</a>
          <Link to="/get-started" className="get-started">
            Get Started
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
          {/* Change motion.button to a Link styled as a button */}
          <Link to="/demo" className="cta-btn">
            Try the Demo
          </Link>
        </motion.div>
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
      
      {/* The conditional rendering for the modal is removed */}
    </div>
  );
}

export default Home;