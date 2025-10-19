import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// ✅ Capitalized imports (match your actual filenames exactly)
import Home from "../components/Home";
import GetStarted from "../components/GetStarted";
import Demo from "../components/demo";
import Login from "../components/Login";

function App() {
  return (
    <Router>
      <Routes>
        {/* 🏠 Homepage */}
        <Route path="/" element={<Home />} />

        {/* 📝 Sign Up Page */}
        <Route path="/get-started" element={<GetStarted />} />

        {/* 💳 Demo Page */}
        <Route path="/demo" element={<Demo />} />

        {/* 🔐 Login Page */}
        <Route path="/login" element={<Login />} />
      </Routes>
    </Router>
  );
}

export default App;
