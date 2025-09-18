'use client';

import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import Cookies from 'js-cookie';
import { User } from '@/types';
import { authApi } from '@/services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!user;

  useEffect(() => {
    const initializeAuth = async () => {
      const token = Cookies.get('accessToken');
      
      if (token) {
        try {
          const response = await authApi.getProfile();
          if (response.success) {
            setUser(response.data.user);
          }
        } catch (error) {
          console.error('Failed to get user profile:', error);
          Cookies.remove('accessToken');
          Cookies.remove('refreshToken');
        }
      }
      
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await authApi.login({ email, password });
      
      if (response.success) {
        const { user, tokens } = response.data;
        
        // Store tokens in cookies
        Cookies.set('accessToken', tokens.accessToken, { expires: 1 }); // 1 day
        Cookies.set('refreshToken', tokens.refreshToken, { expires: 7 }); // 7 days
        
        setUser(user);
        return { success: true };
      } else {
        return { success: false, error: response.message };
      }
    } catch (error: unknown) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Une erreur est survenue lors de la connexion' 
      };
    }
  };

  const logout = async () => {
    try {
      const refreshToken = Cookies.get('refreshToken');
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      Cookies.remove('accessToken');
      Cookies.remove('refreshToken');
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
