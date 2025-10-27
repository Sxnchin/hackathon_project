import React from "react";
// Make sure you're importing useNavigate
import { Link, useLocation, useNavigate } from "react-router-dom";

function Nav() {
  const location = useLocation();
  const showExtraLinks = location.pathname === "/";
  const nav = useNavigate(); // This hook gives you the navigate function

  // This function is for scrolling on the home page
  const handleSmoothScroll = (e, targetId) => {
    e.preventDefault();
    const section = document.querySelector(targetId);
    
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    
    // BUG FIXED: I removed the call to handleOwnersClick() from here.
  };

  // We don't need a separate function, we can just call nav() directly.

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
            {/* These links will scroll */}
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

            {/* FIXED: This link will now navigate to the /owners route.
              I kept it as an <a> tag to match your other links.
            */}
            <a
              href="/owners" // Changed href for clarity
              onClick={(e) => {
                e.preventDefault(); // Prevents the link from reloading the page
                nav("/owners");     // Use navigate to go to the new route
              }}
            >
              Owners
            </a>
          </>
        )}

        {/* 🔹 Identical styling for both buttons */}
        <Link to="/get-started" className="get-started">
          Get Started
        </Link>
        <Link to="/profile" className="get-started">
          Profile
        </Link>
      </div>
    </nav>
  );
}

export default Nav;