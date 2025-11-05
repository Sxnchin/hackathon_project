// nav.jsx
import React, { useState } from "react";
import "./nav.css";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../src/utils/authContext";

function Nav() {
  const location = useLocation();
  const nav = useNavigate();
  const { user } = useAuth();
  const isAuthenticated = Boolean(user);

  // State for the mobile menu
  const [menuOpen, setMenuOpen] = useState(false);

  // Only show extra links on the home page (path is "/")
  const showExtraLinks = location.pathname === "/";

  // This function is for scrolling on the home page
  const handleSmoothScroll = (e, targetId) => {
    e.preventDefault();
    const section = document.querySelector(targetId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    // Close the mobile menu on click
    setMenuOpen(false);
  };

  const OwnersLink = (
    <a
      href="/owners"
      onClick={(e) => {
        e.preventDefault();
        nav("/owners");
        // Close the mobile menu on click
        setMenuOpen(false);
      }}
    >
      Owners
    </a>
  );

  return (
    <header className="header">
      {/* 🔹 1. Logo */}
      <Link
        to="/"
        className="logo"
        // Close menu if logo is clicked
        onClick={() => setMenuOpen(false)}
      >
        LiquidSplit
      </Link>

      {/* 🔹 2. Hamburger Menu Icon */}
      <i
        className={menuOpen ? "bx bx-x" : "bx bx-menu"}
        id="menu-icon"
        onClick={() => setMenuOpen(!menuOpen)}
      ></i>

      {/* 🔹 3. Link Container */}
      {/* This 'nav' tag is the slide-down container */}
      <nav className={menuOpen ? "navbar active" : "navbar"}>
        
        {/* Central Navigation Links (Home page only) */}
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

        {/* Action Buttons (Far Right) */}
        <div className="nav-links">
          
          {/* --- HIDE "Get Started" if logged in --- */}
          {!isAuthenticated && (
            <Link 
              to="/get-started" 
              className="get-started"
              onClick={() => setMenuOpen(false)}
            >
              Get Started
            </Link>
          )}

          {/* User Pots (Solid Button) */}
          {isAuthenticated && (
            <>
              <Link 
                to="/friends" 
                className="get-started"
                onClick={() => setMenuOpen(false)}
              >
                Friends
              </Link>
              <Link 
                to="/pots" 
                className="get-started"
                onClick={() => setMenuOpen(false)}
              >
                Your Pots
              </Link>
            </>
          )}

          {/* Log In / Profile (Secondary, Outlined Button) */}
          {isAuthenticated ? (
            <Link 
              to="/profile" 
              className="login-btn-nav"
              onClick={() => setMenuOpen(false)}
            >
              Profile
            </Link>
          ) : (
            <Link 
              to="/login" 
              className="login-btn-nav"
              onClick={() => setMenuOpen(false)}
            >
              Log In
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Nav;