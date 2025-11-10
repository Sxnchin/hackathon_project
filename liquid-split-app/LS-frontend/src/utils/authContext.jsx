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
    if (!token || !userData) return;
    localStorage.setItem('liquidSplitToken', token);
    localStorage.setItem('token', token);
    localStorage.setItem('liquidSplitUser', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('liquidSplitToken');
    localStorage.removeItem('token');
    localStorage.removeItem('liquidSplitUser');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, readToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
