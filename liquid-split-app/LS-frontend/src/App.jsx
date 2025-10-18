// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "../components/home";
// Remove this import, it's not needed here anymore
// import GetStarted from "../components/getStarted"; 

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        {/* Delete this line */}
        <Route path="/get-started" element={<GetStarted />} />
      </Routes>
    </Router>
  );
}

export default App;