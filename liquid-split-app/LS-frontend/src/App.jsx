import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "../components/home";
import GetStarted from "../components/getStarted";
import Demo from "../components/demo"; // 1. Import the Demo component
import Login from "../components/login";
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/get-started" element={<GetStarted />} />
        <Route path="/demo" element={<Demo />} /> {/* 2. Add the new route for the demo page */}
        <Route path="/login" element={<Login />} />
      </Routes>
    </Router>
  );
}

export default App;