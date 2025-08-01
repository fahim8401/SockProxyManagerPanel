import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';

const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds
const SESSION_KEY = 'admin_session';

interface AuthState {
  isAuthenticated: boolean;
  lastActivity: number;
}

export function useAuth() {
  const [, setLocation] = useLocation();
  const [authState, setAuthState] = useState<AuthState>(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const now = Date.now();
      if (now - parsed.lastActivity < SESSION_TIMEOUT) {
        return { isAuthenticated: true, lastActivity: now };
      }
    }
    return { isAuthenticated: false, lastActivity: 0 };
  });

  const updateActivity = useCallback(() => {
    const now = Date.now();
    setAuthState(prev => {
      if (prev.isAuthenticated) {
        const newState = { isAuthenticated: true, lastActivity: now };
        localStorage.setItem(SESSION_KEY, JSON.stringify(newState));
        return newState;
      }
      return prev;
    });
  }, []);

  const login = useCallback((password: string) => {
    // Simple admin password check
    if (password === 'admin123') {
      const now = Date.now();
      const newState = { isAuthenticated: true, lastActivity: now };
      setAuthState(newState);
      localStorage.setItem(SESSION_KEY, JSON.stringify(newState));
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setAuthState({ isAuthenticated: false, lastActivity: 0 });
    localStorage.removeItem(SESSION_KEY);
    setLocation('/login');
  }, [setLocation]);

  // Auto-logout after inactivity
  useEffect(() => {
    if (!authState.isAuthenticated) return;

    const checkSession = () => {
      const now = Date.now();
      if (now - authState.lastActivity > SESSION_TIMEOUT) {
        logout();
      }
    };

    const interval = setInterval(checkSession, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [authState, logout]);

  // Update activity on user interactions
  useEffect(() => {
    if (!authState.isAuthenticated) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const throttle = (func: Function, limit: number) => {
      let inThrottle: boolean;
      return function(...args: any[]) {
        if (!inThrottle) {
          func.apply(null, args);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      };
    };

    const throttledUpdate = throttle(updateActivity, 10000); // Throttle to every 10 seconds

    events.forEach(event => {
      document.addEventListener(event, throttledUpdate, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, throttledUpdate, true);
      });
    };
  }, [authState.isAuthenticated, updateActivity]);

  return {
    isAuthenticated: authState.isAuthenticated,
    login,
    logout,
    updateActivity
  };
}