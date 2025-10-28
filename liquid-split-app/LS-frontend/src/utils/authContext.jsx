import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('liquidSplitUser')) || null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    const handleStorage = () => {
      try { setUser(JSON.parse(localStorage.getItem('liquidSplitUser')) || null); } catch (e) { setUser(null); }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const login = (token, user) => {
    localStorage.setItem('liquidSplitToken', token);
    localStorage.setItem('token', token);
    localStorage.setItem('liquidSplitUser', JSON.stringify(user));
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('liquidSplitToken');
    localStorage.removeItem('token');
    localStorage.removeItem('liquidSplitUser');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
