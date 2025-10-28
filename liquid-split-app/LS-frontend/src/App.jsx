import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// ✅ Import Components (match the filenames & capitalization exactly)
import Nav from "../components/nav";
import Home from "../components/home";
import GetStarted from "../components/getStarted";
import Demo from "../components/demo";
import OnboardSuccess from "../components/onboardSuccess";
import Login from "../components/login";
import Profile from "../components/profile";
import Pots from "../components/pots";
import ProtectedRoute from "../components/ProtectedRoute";

import Owners from "../components/owners";
// ✅ Auth Context
import { AuthProvider } from "./utils/authContext";

function App() {
  return (
    <AuthProvider>
      <Router>
        {/* 🔝 Global Navbar (shows on all pages) */}
        <Nav />

        {/* 🧭 Route Configuration */}
        <Routes>
          {/* 🏠 Homepage */}
          <Route path="/" element={<Home />} />

          {/* 📝 Sign Up Page */}
          <Route path="/get-started" element={<GetStarted />} />

          {/* 💳 Demo Page */}
          <Route path="/demo" element={<Demo />} />

          <Route path = "/owners" element = {<Owners />} />
          {/* ✅ Stripe Onboarding Return */}
          <Route path="/onboard/success" element={<OnboardSuccess />} />

          {/* 🔐 Login Page */}
          <Route path="/login" element={<Login />} />

          {/* 👤 Profile Page */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* 🪣 Your Pots Page */}
          <Route
            path="/pots"
            element={
              <ProtectedRoute>
                <Pots />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
