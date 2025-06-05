import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from '../utils/axiosConfig';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if user is already logged in
    const checkAuthStatus = async () => {
      try {
        // Check if we have a stored token
        const authToken = localStorage.getItem('authToken');
        console.log('Checking auth status. Token exists:', !!authToken);
        
        if (authToken) {
          // If we have a token, try to get current user data
          const response = await axios.get('/api/current-user/');
          console.log('Current user response:', response.data);
          setCurrentUser(response.data);
        } else {
          // No token, user is not logged in
          setCurrentUser(null);
        }
      } catch (error) {
        // User is not logged in, that's okay
        console.log('User not logged in:', error);
        setCurrentUser(null);
        // Clear any stale token
        localStorage.removeItem('authToken');
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (email, password) => {
    try {
      setError('');
      const response = await axios.post('/api/login/', { email, password });
      
      // Store the user data from response
      setCurrentUser(response.data.user);
      
      // For session-based auth, store a dummy token to indicate authenticated status
      // (Django is using session auth so we just need to know the user is logged in)
      localStorage.setItem('authToken', 'session-authenticated');
      
      return response.data;
    } catch (error) {
      setError(error.response?.data?.message || 'Login failed');
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      setError('');
      const response = await axios.post('/api/register/', userData);
      return response.data;
    } catch (error) {
      setError(error.response?.data?.message || 'Registration failed');
      throw error;
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/logout/');
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with logout even if API call fails
    } finally {
      // Always clear user data locally
      setCurrentUser(null);
      // Clear any stored auth data in localStorage if you're using it
      localStorage.removeItem('authToken'); // Remove if you're not using token-based auth
    }
  };

  const updateUserInfo = (userData) => {
    setCurrentUser(userData);
  };

  const getAuthHeaders = () => {
    // For session-based auth, this may not be needed as cookies handle auth
    // But we'll include it for API requests that might need CSRF tokens
    return {
      'X-CSRFToken': document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1] || '',
    };
  };

  const value = {
    currentUser,
    login,
    register,
    logout,
    updateUserInfo,
    getAuthHeaders,
    loading,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 