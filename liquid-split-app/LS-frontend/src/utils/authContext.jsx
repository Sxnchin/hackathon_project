import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const readToken = useCallback(() => {
    return (
      localStorage.getItem('liquidSplitToken') ||
      localStorage.getItem('token') ||
      null
    );
  }, []);

  const readUser = useCallback(() => {
    const token = readToken();
    if (!token) return null;
    try {
      const raw = localStorage.getItem('liquidSplitUser');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [readToken]);

  const [user, setUser] = useState(() => readUser());

  useEffect(() => {
    const handleStorage = () => {
        setUser(readUser());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [readUser]);
  const login = useCallback((token, userData) => {
    // Allow calling login either with (token, userData) or (null, userData) when cookie-based auth is used
    if (!userData) return;
    if (token) {
      localStorage.setItem('liquidSplitToken', token);
      localStorage.setItem('token', token);
    }
    localStorage.setItem('liquidSplitUser', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('liquidSplitToken');
    localStorage.removeItem('token');
    localStorage.removeItem('liquidSplitUser');
    setUser(null);
  }, []);

  // On mount, if no user is present in localStorage, attempt to bootstrap session via cookie
  useEffect(() => {
    let mounted = true;
    const tryBootstrap = async () => {
      const existing = readUser();
      if (existing) return;
      try {
        const resp = await fetch((import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000') + '/auth/me', { credentials: 'include' });
        if (!mounted) return;
        if (resp.ok) {
          const data = await resp.json();
          if (data && data.user) {
            // set a placeholder token so ProtectedRoute sees us as authenticated
            const placeholder = 'cookie';
            login(placeholder, data.user);
          }
        }
      } catch (err) {
        // ignore
      }
    };
    tryBootstrap();
    return () => { mounted = false; };
  }, [login, readUser]);

  return (
    <AuthContext.Provider value={{ user, login, logout, readToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
