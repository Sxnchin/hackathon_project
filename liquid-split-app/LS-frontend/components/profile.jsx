import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import "./profile.css";
import { useAuth } from "../src/utils/authContext";

function Profile() {
  const { user, logout } = useAuth();
  const isAuthenticated = Boolean(user?.email);
  
  // State for user stats
  const [stats, setStats] = useState({
    groupsCount: 0,
    friendsCount: 0,
    potsCount: 0,
    receiptsCount: 0
  });
  
  // State for notifications
  const [notifications, setNotifications] = useState({
    groupInvites: true,
    friendRequests: true,
    receiptUploads: true,
    paymentReminders: true
  });
  
  const [showNotif, setShowNotif] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Listen for groups:refresh event from notifications
  useEffect(() => {
    const handleGroupsRefresh = () => {
      // Reload stats which includes groups count
      if (isAuthenticated && user?.id) {
        fetchStats();
      }
    };

    window.addEventListener("groups:refresh", handleGroupsRefresh);
    return () => window.removeEventListener("groups:refresh", handleGroupsRefresh);
  }, [isAuthenticated, user?.id]);

  // Fetch user stats
  const fetchStats = async () => {
    if (!isAuthenticated || !user?.id) return;
    try {
      const token = localStorage.getItem('token');
      
      // Fetch groups
      const groupsRes = await fetch('http://localhost:4000/groups', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const groupsData = await groupsRes.json();
      
      // Fetch friends
      const friendsRes = await fetch('http://localhost:4000/friends', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const friendsData = await friendsRes.json();
      
      // Fetch pots
      const potsRes = await fetch('http://localhost:4000/pots', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const potsData = await potsRes.json();
      
      setStats({
        groupsCount: Array.isArray(groupsData.groups) ? groupsData.groups.length : 0,
        friendsCount: Array.isArray(friendsData.friends) ? friendsData.friends.length : 0,
        potsCount: Array.isArray(potsData.pots) ? potsData.pots.length : 0,
        receiptsCount: 0 // Can add receipt count later if needed
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [isAuthenticated, user?.id]);

  // Handler for Stripe Connect onboarding
  const handleConnectStripe = async () => {
    if (!user?.id) return alert('User not found. Please log in.');
    try {
      const res = await fetch('http://localhost:4000/stripe/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.open(data.url, '_blank', 'noopener');
      } else {
        alert(data.error || 'Could not start Stripe onboarding');
      }
    } catch (err) {
      alert('Error connecting to Stripe.');
    }
  };

  // Handler for Plaid connect
  const handleConnectPlaid = () => {
    alert('Plaid connection flow would start here.');
  };

  // Toggle notification preference
  const handleToggleNotification = (key) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    setShowNotif({ type: 'success', message: 'Notification preferences updated!' });
    setTimeout(() => setShowNotif(null), 2000);
  };

  // Delete account
  const handleDeleteAccount = async () => {
    if (!user?.id) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:4000/auth/delete-account`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        setShowNotif({ type: 'success', message: 'Account deleted successfully' });
        setTimeout(() => {
          logout();
          localStorage.removeItem('token');
          window.location.href = '/';
        }, 1500);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete account');
      }
    } catch (err) {
      alert('Error deleting account');
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  if (!isAuthenticated) {
    return (
      <div className="login-demo-bg">
        <motion.div
          className="login-card-modern"
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="login-header">
            <h2 className="text-3xl font-bold text-gray-800">Login Required</h2>
            <p className="text-gray-500 mt-2">Sign in to view your profile.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
            <Link to="/login" className="login-btn-modern" style={{ textAlign: 'center' }}>
              Go to Login
            </Link>
            <Link to="/" className="back-link-modern">&larr; Back to Home</Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="login-demo-bg" style={{ padding: '2rem 1rem' }}>
      {/* Toast Notification */}
      <AnimatePresence>
        {showNotif && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            style={{
              position: "fixed",
              top: 30,
              left: '50%',
              background: showNotif.type === 'success' ? "#22c55e" : "#ef4444",
              color: "white",
              padding: "0.75rem 1.5rem",
              borderRadius: "0.5rem",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              zIndex: 1000,
              fontWeight: "bold"
            }}
          >
            {showNotif.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Profile Header Card */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            background: 'white',
            borderRadius: '1rem',
            padding: '2rem',
            marginBottom: '1.5rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            {/* Avatar */}
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              fontWeight: 'bold',
              color: 'white',
              boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)'
            }}>
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            
            {/* User Info */}
            <div style={{ flex: 1, minWidth: '200px' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>
                {user?.name || 'User'}
              </h1>
              <p style={{ color: '#6b7280', fontSize: '1rem', marginBottom: '0.25rem' }}>
                📧 {user?.email || 'No email'}
              </p>
              <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                📅 Member since {formatDate(user?.createdAt)}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}
        >
          <div style={{
            background: 'white',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            borderTop: '4px solid #7c3aed'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#7c3aed' }}>
              {stats.groupsCount}
            </div>
            <div style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Groups
            </div>
          </div>

          <div style={{
            background: 'white',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            borderTop: '4px solid #10b981'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>
              {stats.friendsCount}
            </div>
            <div style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Friends
            </div>
          </div>

          <div style={{
            background: 'white',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            borderTop: '4px solid #f59e0b'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>
              {stats.potsCount}
            </div>
            <div style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Pots
            </div>
          </div>

          <div style={{
            background: 'white',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            borderTop: '4px solid #3b82f6'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>
              {stats.receiptsCount}
            </div>
            <div style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Receipts
            </div>
          </div>
        </motion.div>

        {/* Two Column Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          
          {/* Integrations Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{
              background: 'white',
              borderRadius: '1rem',
              padding: '1.5rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1rem' }}>
              🔗 Integrations
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleConnectPlaid}
                style={{
                  width: '100%',
                  padding: '0.875rem',
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
                }}
              >
                🏦 Connect Plaid
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleConnectStripe}
                style={{
                  width: '100%',
                  padding: '0.875rem',
                  background: '#635bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(99, 91, 255, 0.3)'
                }}
              >
                💳 Connect Stripe
              </motion.button>
            </div>
          </motion.div>

          {/* Notification Preferences */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            style={{
              background: 'white',
              borderRadius: '1rem',
              padding: '1.5rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1rem' }}>
              🔔 Notifications
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { key: 'groupInvites', label: 'Group Invitations' },
                { key: 'friendRequests', label: 'Friend Requests' },
                { key: 'receiptUploads', label: 'Receipt Uploads' },
                { key: 'paymentReminders', label: 'Payment Reminders' }
              ].map(({ key, label }) => (
                <div
                  key={key}
                  onClick={() => handleToggleNotification(key)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem',
                    background: '#f9fafb',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#f9fafb'}
                >
                  <span style={{ fontSize: '0.9rem', color: '#374151' }}>{label}</span>
                  <div style={{
                    width: '44px',
                    height: '24px',
                    borderRadius: '12px',
                    background: notifications[key] ? '#7c3aed' : '#d1d5db',
                    position: 'relative',
                    transition: 'all 0.3s'
                  }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: 'white',
                      position: 'absolute',
                      top: '2px',
                      left: notifications[key] ? '22px' : '2px',
                      transition: 'all 0.3s',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Account Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          style={{
            background: 'white',
            borderRadius: '1rem',
            padding: '1.5rem',
            marginTop: '1.5rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
          }}
        >
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1rem' }}>
            ⚙️ Account Actions
          </h3>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
            <Link to="/demo" style={{ textDecoration: 'none' }}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#7c3aed',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Go to Demo
              </motion.button>
            </Link>

            <Link to="/change-password" style={{ textDecoration: 'none' }}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Change Password
              </motion.button>
            </Link>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                logout();
                localStorage.removeItem("token");
                window.location.href = '/';
              }}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Sign Out
            </motion.button>
          </div>

          {/* Danger Zone */}
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            background: '#fef2f2',
            borderRadius: '0.5rem',
            border: '1px solid #fecaca'
          }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#dc2626', marginBottom: '0.5rem' }}>
              ⚠️ Danger Zone
            </h4>
            <p style={{ fontSize: '0.85rem', color: '#7f1d1d', marginBottom: '0.75rem' }}>
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            
            {!showDeleteConfirm ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  padding: '0.625rem 1.25rem',
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Delete Account
              </motion.button>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#7f1d1d', fontWeight: '600' }}>
                  Are you sure?
                </span>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDeleteAccount}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Yes, Delete
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </motion.button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Back Link */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link to="/" style={{ color: '#7c3aed', textDecoration: 'none', fontSize: '0.95rem', fontWeight: '500' }}>
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Profile;
