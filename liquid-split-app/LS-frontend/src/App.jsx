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
import CompleteProfile from "../components/completeProfile";
import Pots from "../components/pots";
import ProtectedRoute from "../components/ProtectedRoute";
import Friends from "../components/friends";
import Owners from "../components/owners";
import ChangePassword from "../components/changePassword";
import ForgotPassword from "../components/forgotPassword";
import FreshNFTs from "../components/FreshNFTs";
import NFTDemo from "./components/NFTDemo";

// ✅ Auth Context
import { AuthProvider } from "./utils/authContext";

// ✅ Web3 Context
import { Web3Provider } from "./utils/web3Context";

function App() {
  return (
    <AuthProvider>
      <Web3Provider>
        <div className="app">
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
          <Route path = "/friends" element = {<Friends/>}/>
          {/* ✅ Stripe Onboarding Return */}
          <Route path="/onboard/success" element={<OnboardSuccess />} />

          {/* 🔐 Login Page */}
          <Route path="/login" element={<Login />} />

          {/* ✅ Complete profile after OAuth */}
          <Route path="/complete-profile" element={<CompleteProfile />} />

          {/* � Forgot Password Page */}
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* �👤 Profile Page */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* 🔐 Change Password Page */}
          <Route
            path="/change-password"
            element={
              <ProtectedRoute>
                <ChangePassword />
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

          {/* 🎨 NFT Minting Demo */}
          <Route path="/nft-demo" element={<NFTDemo />} />

          {/* 🎨 Fresh NFT Collection */}
          <Route path="/pots/:potId/nfts" element={<FreshNFTs />} />
        </Routes>
          </Router>
        </div>
      </Web3Provider>
    </AuthProvider>
  );
}

export default App;
