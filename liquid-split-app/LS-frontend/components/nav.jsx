import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../src/utils/authContext";

function Nav() {
  const location = useLocation();
  const showExtraLinks = location.pathname === "/";
  const { user } = useAuth();
  const isAuthenticated = Boolean(user);

  const handleSmoothScroll = (e, targetId) => {
    e.preventDefault();
    const section = document.querySelector(targetId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <nav className="navbar">
      {/* 🔹 Logo (no underline / no hover color) */}
      <Link
        to="/"
        className="nav-logo"
        style={{
          textDecoration: "none",
          color: "var(--brand-primary)",
          fontWeight: 800,
          fontSize: "1.6rem",
          letterSpacing: "-0.5px",
        }}
      >
        LiquidSplit
      </Link>

      <div className="nav-links">
        {showExtraLinks && (
          <>
            <a
              href="#how-it-works"
              onClick={(e) => handleSmoothScroll(e, "#how-it-works")}
            >
              How It Works
            </a>
            <a
              href="#features"
              onClick={(e) => handleSmoothScroll(e, "#features")}
            >
              Features
            </a>
          </>
        )}

        {/* 🔹 Identical styling for both buttons */}
        <Link to="/get-started" className="get-started">
          Get Started
        </Link>
        {isAuthenticated && (
          <Link to="/pots" className="get-started">
            Your Pots
          </Link>
        )}
        {isAuthenticated ? (
          <Link to="/profile" className="get-started">
            Profile
          </Link>
        ) : (
          <Link to="/login" className="get-started">
            Log In
          </Link>
        )}
      </div>
    </nav>
  );
}

export default Nav;
