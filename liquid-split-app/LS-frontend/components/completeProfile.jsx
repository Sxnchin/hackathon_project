import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../src/utils/authContext';

export default function CompleteProfile() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    // Cookie-based flow: nothing to do on mount. Backend sets httpOnly cookie on redirect.
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim()) return setError('Please enter a username');
    setLoading(true);
    try {
      // Use cookie-based authentication; include credentials so browser sends httpOnly cookie
      const res = await fetch('http://localhost:4000/auth/complete-profile', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: username.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not complete profile');
        setLoading(false);
        return;
      }

      // Cookie-only flow: update user in auth context. login accepts missing token.
      login(null, data.user);
      navigate('/profile');
    } catch (err) {
      console.error('Complete profile error', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ width: 420, padding: '2rem', borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.08)', background: '#fff' }}>
        <h2 style={{ marginBottom: '1rem' }}>Almost there — pick a username</h2>
        <p style={{ marginBottom: '1rem', color: '#6b7280' }}>Choose a display name that will be shown to your friends.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="username">Username</label>
          <input id="username" value={username} onChange={(e) => setUsername(e.target.value)} style={{ width: '100%', padding: '0.6rem', margin: '0.5rem 0 1rem 0' }} />
          {error && <div style={{ color: '#ef4444', marginBottom: '0.75rem' }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ padding: '0.6rem 1rem', background: '#4f46e5', color: '#fff', borderRadius: 6, border: 'none' }}>{loading ? 'Saving...' : 'Save Username'}</button>
        </form>
      </motion.div>
    </div>
  );
}
