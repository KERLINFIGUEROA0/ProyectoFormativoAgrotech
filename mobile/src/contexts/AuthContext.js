import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      console.log('🔍 AuthContext: Checking login status');
      const token = await AsyncStorage.getItem('access_token');
      console.log('🔑 AuthContext: Token found:', !!token);
      setIsLoggedIn(!!token);
      console.log('✅ AuthContext: isLoggedIn set to:', !!token);
    } catch (error) {
      console.error('❌ AuthContext: Error checking login status:', error);
      setIsLoggedIn(false);
    } finally {
      console.log('🔄 AuthContext: Setting isLoading to false');
      setIsLoading(false);
    }
  };

  const login = async (token) => {
    try {
      console.log('🔑 AuthContext: Saving token');
      await AsyncStorage.setItem('access_token', token);
      console.log('✅ AuthContext: Token saved, setting isLoggedIn to true');
      setIsLoggedIn(true);
    } catch (error) {
      console.error('❌ AuthContext: Error saving token:', error);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('access_token');
      setIsLoggedIn(false);
    } catch (error) {
      console.error('Error removing token:', error);
    }
  };

  const value = {
    isLoggedIn,
    isLoading,
    login,
    logout,
    checkLoginStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};