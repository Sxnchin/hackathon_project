import React from "react";
import "./App.css";

function App() {
  return (
    <div className="app-container">
      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-logo">LiquidSplit</div>
        <div className="nav-links">
          <a href="#how-it-works">How It Works</a>
          <a href="#features">Features</a>
          <a href="#contact" className="get-started">
            Get Started
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>Split purchases, not friendships.</h1>
          <p>
            The easiest way to co-own anything with friends. Split payments in
            real time — powered by LiquidSplit.
          </p>
          <button className="cta-btn">Try the Demo</button>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="how-section">
        <h2>How It Works</h2>
        <div className="cards">
          <div className="card">
            <h3>1. Checkout Anywhere</h3>
            <p>
              Pay through LiquidSplit directly at any online checkout — no app
              switching, no waiting.
            </p>
          </div>
          <div className="card">
            <h3>2. Invite Friends</h3>
            <p>
              Instantly invite your friends to join the purchase and claim their
              share.
            </p>
          </div>
          <div className="card">
            <h3>3. Everyone Owns</h3>
            <p>
              Everyone gets a verified digital receipt showing exactly what
              they own.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <h2>Why LiquidSplit</h2>
        <div className="feature-grid">
          <div className="feature-box">
            <h3>⚡ Real-Time Splitting</h3>
            <p>Split any payment at checkout instantly.</p>
          </div>
          <div className="feature-box">
            <h3>🔐 Secure by Design</h3>
            <p>Built on encrypted payment flows with verified transactions.</p>
          </div>
          <div className="feature-box">
            <h3>🪪 Digital Receipts</h3>
            <p>Transparent co-ownership records for everyone involved.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>© 2025 LiquidSplit — Built for the Hackathon.</p>
      </footer>
    </div>
  );
}

export default App;
