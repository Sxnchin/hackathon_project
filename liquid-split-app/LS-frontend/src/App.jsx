import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "../components/Home";
import GetStarted from "../components/GetStarted";
import Demo from "../components/Demo";
import Login from "../components/Login";
import ProtectedRoute from "../components/ProtectedRoute";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/get-started" element={<GetStarted />} />
        <Route
          path="/demo"
          element={
            <ProtectedRoute>
              <Demo />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<Login />} />
      </Routes>
    </Router>
  );
}

export default App;