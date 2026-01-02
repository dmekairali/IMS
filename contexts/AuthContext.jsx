// contexts/AuthContext.jsx
'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in on mount
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      // Also set cookie for middleware
      document.cookie = `auth-token=${JSON.parse(storedUser).username}; path=/; max-age=86400`; // 24 hours
    }
    setLoading(false);
  }, []);

  const login = (username, password) => {
    // Fixed credentials
    const credentials = {
      admin: { password: 'admin', role: 'admin', name: 'Administrator' },
      store: { password: 'store', role: 'store', name: 'Store Manager' }
    };

    const userCred = credentials[username.toLowerCase()];
    
    if (userCred && userCred.password === password) {
      const userData = {
        username: username.toLowerCase(),
        role: userCred.role,
        name: userCred.name,
        loginTime: new Date().toISOString()
      };
      
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      // Set cookie for middleware
      document.cookie = `auth-token=${userData.username}; path=/; max-age=86400`; // 24 hours
      return { success: true, user: userData };
    }
    
    return { success: false, error: 'Invalid username or password' };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    // Remove cookie
    document.cookie = 'auth-token=; path=/; max-age=0';
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
