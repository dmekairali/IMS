// contexts/AuthContext.jsx - Updated with UserAccess integration
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
      document.cookie = `auth-token=${JSON.parse(storedUser).employeeId}; path=/; max-age=86400`; // 24 hours
    }
    setLoading(false);
  }, []);

  const login = async (employeeId, passkey) => {
    try {
      // Fetch users from UserAccess sheet
      const response = await fetch('/api/users/list');
      
      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }
      
      const { users } = await response.json();
      
      // Find user by employeeId and validate passkey
      const userRecord = users.find(u => u.employeeId === employeeId);
      
      if (userRecord && userRecord.passkey === passkey) {
        const userData = {
          employeeId: userRecord.employeeId,
          name: userRecord.name,
          email: userRecord.email,
          role: userRecord.role,
          permissions: userRecord.permissions,
          loginTime: new Date().toISOString()
        };
        
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        // Set cookie for middleware
        document.cookie = `auth-token=${userData.employeeId}; path=/; max-age=86400`; // 24 hours
        return { success: true, user: userData };
      }
      
      return { success: false, error: 'Invalid employee ID or passkey' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed. Please try again.' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    // Remove cookie
    document.cookie = 'auth-token=; path=/; max-age=0';
    router.push('/login');
  };

  const hasPermission = (section, requiredLevel = 'View') => {
    if (!user || !user.permissions) return false;
    
    const userPermission = user.permissions[section];
    
    // Admin has all permissions
    if (userPermission === 'Admin') return true;
    
    // Check if user has required level
    if (requiredLevel === 'View') {
      return ['View', 'Edit', 'Admin'].includes(userPermission);
    } else if (requiredLevel === 'Edit') {
      return ['Edit', 'Admin'].includes(userPermission);
    } else if (requiredLevel === 'Admin') {
      return userPermission === 'Admin';
    }
    
    return false;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, hasPermission }}>
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
