/**
 * Authentication hook and context.
 * Provides login, logout, and user state throughout the app.
 */
import { createContext, useContext, useState, useCallback } from 'react';
import { loginApi, logoutApi, setToken, clearToken, getToken, getStoredUser, setStoredUser } from '../services/api';

// Shape of the auth context value
export interface AuthContextType {
  user: any | null;
  token: string | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// Create the context with a default value
export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoggedIn: false,
  isAdmin: false,
  login: async () => {},
  logout: async () => {},
});

/** Hook to access auth state and actions from any component */
export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}

/** Hook that provides the auth state - used in the AuthProvider component */
export function useAuthProvider(): AuthContextType {
  // Initialize state from localStorage (persists across page refreshes)
  const [user, setUser] = useState<any | null>(getStoredUser());
  const [token, setTokenState] = useState<string | null>(getToken());

  const isLoggedIn = !!token;
  const isAdmin = user?.role === 'admin';

  // Login function - calls the API and stores the token
  const login = useCallback(async (email: string, password: string) => {
    const data = await loginApi(email, password);
    setToken(data.token);
    setStoredUser(data.user);
    setTokenState(data.token);
    setUser(data.user);
  }, []);

  // Logout function - calls the API and clears stored data
  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } catch {
      // Even if the API call fails, clear local state
    }
    clearToken();
    setTokenState(null);
    setUser(null);
  }, []);

  return { user, token, isLoggedIn, isAdmin, login, logout };
}
