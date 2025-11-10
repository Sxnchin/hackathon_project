import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../utils/authContext';
import '../../components/nav.css';

export default function Nav() {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="nav-logo">LiquidSplit</div>
      <div className="nav-links">
        <a href="#how-it-works">How It Works</a>
        <a href="#features">Features</a>
        <Link to="/get-started" className="get-started">Get Started</Link>
        {user ? (
          <>
            <Link to="/profile" className="get-started">Profile</Link>
          </>
        ) : (
          <Link to="/login" className="get-started">Login</Link>
        )}
      </div>
    </nav>
  );
}
