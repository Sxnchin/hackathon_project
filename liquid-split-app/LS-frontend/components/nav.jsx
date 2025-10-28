import React from "react";
// Make sure you're importing useNavigate
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../src/utils/authContext";
function Nav() {
  const location = useLocation();
  // Only show extra links on the home page (path is "/")
  const showExtraLinks = location.pathname === "/"; 
  const nav = useNavigate(); 

  const { user } = useAuth();
  const isAuthenticated = Boolean(user);

  // This function is for scrolling on the home page
  const handleSmoothScroll = (e, targetId) => {
    e.preventDefault();
    const section = document.querySelector(targetId);
    
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const OwnersLink = (
    <a
      href="/owners" 
      onClick={(e) => {
        e.preventDefault(); 
        nav("/owners");     
      }}
    >
      Owners
    </a>
  );

  return (
    <nav className="navbar">
      {/* 🔹 1. Logo */}
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

      {/* 🔹 2. Central Navigation Links (Visible only on home page) */}
      {showExtraLinks && (
        <div className="nav-center-links">
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
          {OwnersLink}
        </div>
      )}
      
      {/* 🔹 3. Action Buttons (Far Right) */}
      <div className="nav-links">
        
        {/* Primary Call to Action */}
        <Link to="/get-started" className="get-started">
          Get Started
        </Link>

        {/* User Pots (Solid Button - same as Get Started) */}
        {isAuthenticated && (
          <Link to="/pots" className="get-started">
            Your Pots
          </Link>
        )}

        {/* Log In / Profile (Secondary, Outlined Button: login-btn-nav) */}
        {isAuthenticated ? (
          <Link to="/profile" className="login-btn-nav">
            Profile
          </Link>
        ) : (
          <Link to="/login" className="login-btn-nav">
            Log In
          </Link>
        )}
      </div>
    </nav>
  );
}

export default Nav;
