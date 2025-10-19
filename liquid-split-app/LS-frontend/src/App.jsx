import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// ✅ Capitalized imports (match your actual filenames exactly)
import Nav from "../components/nav";
import Home from "../components/Home";
import GetStarted from "../components/GetStarted";
import Demo from "../components/demo";
import OnboardSuccess from "../components/onboardSuccess";
import Login from "../components/Login";
import Profile from "../components/profile";
import { AuthProvider } from "./utils/authContext";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Nav />
        <Routes>
        {/* 🏠 Homepage */}
        <Route path="/" element={<Home />} />

        {/* 📝 Sign Up Page */}
        <Route path="/get-started" element={<GetStarted />} />

  {/* 💳 Demo Page */}
  <Route path="/demo" element={<Demo />} />

  {/* Stripe Onboarding return */}
  <Route path="/onboard/success" element={<OnboardSuccess />} />

        {/* 🔐 Login Page */}
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<Profile />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
