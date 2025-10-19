import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// ✅ Make sure these filenames match exactly
import Home from "../components/Home";
import GetStarted from "../components/GetStarted";
import Demo from "../components/Demo";
import Login from "../components/Login";
import UserProfile from "../components/Profile"; // 👈 new profile page
import ProtectedRoute from "../components/ProtectedRoute";

function App() {
  return (
    <Router>
      <Routes>
        {/* 🏠 Homepage */}
        <Route path="/" element={<Home />} />

        {/* 📝 Sign Up Page */}
        <Route path="/get-started" element={<GetStarted />} />

        {/* 💳 Demo Page (Protected) */}
        <Route
          path="/demo"
          element={
            <ProtectedRoute>
              <Demo />
            </ProtectedRoute>
          }
        />

        {/* 🔐 Login Page */}
        <Route path="/login" element={<Login />} />

        {/* 👤 User Profile (Protected with Plaid Connect) */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <UserProfile />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;