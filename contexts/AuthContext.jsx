// contexts/AuthContext.jsx - Updated with UserAccess integration
'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const AuthContext = createContext();

const DEFAULT_PERMISSIONS = {
  dispatch: 'View',
  packing: 'View',
  consignment: 'View',
  reports: 'View',
  liveStock: 'View',
  qc: 'No Access',
};

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : `${value || ''}`.trim());

const normalizePermissionValue = (value) => {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === 'admin') return 'Admin';
  if (normalized === 'edit') return 'Edit';
  if (normalized === 'view') return 'View';
  return normalized === 'no access' ? 'No Access' : '';
};

const getPermissionFromObject = (permissions, key) => {
  if (!permissions || typeof permissions !== 'object') return '';
  const direct = normalizePermissionValue(permissions[key]);
  if (direct) return direct;
  const fallback = Object.keys(permissions || {}).find((k) => k.toLowerCase() === key.toLowerCase());
  return fallback ? normalizePermissionValue(permissions[fallback]) : '';
};

const normalizePermissions = (permissions, qcUploadUrl = '') => {
  const normalized = { ...DEFAULT_PERMISSIONS };

  Object.keys(DEFAULT_PERMISSIONS).forEach((key) => {
    const value = getPermissionFromObject(permissions, key);
    if (value) normalized[key] = value;
  });

  if ((!getPermissionFromObject(permissions, 'qc')) && normalizeText(qcUploadUrl)) {
    normalized.qc = 'View';
  }

  return normalized;
};

const normalizeUser = (rawUser) => {
  if (!rawUser || typeof rawUser !== 'object') return null;
  const qcUploadUrl = normalizeText(rawUser.qcUploadUrl);
  return {
    ...rawUser,
    qcUploadUrl,
    permissions: normalizePermissions(rawUser.permissions, qcUploadUrl),
  };
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in on mount
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = normalizeUser(JSON.parse(storedUser));
      if (parsedUser) {
        setUser(parsedUser);
        localStorage.setItem('user', JSON.stringify(parsedUser));
      }
      // Also set cookie for middleware
      document.cookie = `auth-token=${parsedUser?.employeeId || ''}; path=/; max-age=86400`; // 24 hours
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
        const userData = normalizeUser({
          employeeId: userRecord.employeeId,
          name: userRecord.name,
          email: userRecord.email,
          role: userRecord.role,
          permissions: userRecord.permissions,
          qcUploadUrl: userRecord.qcUploadUrl || '',
          loginTime: new Date().toISOString(),
        });
        
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
    
    const userPermission = normalizePermissionValue(user.permissions[section]);
    
    // Admin has all permissions
    if (userPermission === 'Admin') return true;
    if (section === 'qc' && !userPermission && normalizeText(user.qcUploadUrl)) {
      return requiredLevel === 'View';
    }
    
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
