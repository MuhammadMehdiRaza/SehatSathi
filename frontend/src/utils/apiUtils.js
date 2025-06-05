/**
 * Utility functions for API handling
 */

// Base API URL - update if needed based on your deployment
const API_BASE_URL = 'http://localhost:8000';

/**
 * Get the complete API URL for an endpoint
 * @param {string} endpoint - The API endpoint (without leading slash)
 * @returns {string} The complete API URL
 */
export const getApiUrl = (endpoint) => {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
  return `${API_BASE_URL}/api/${cleanEndpoint}`;
};

/**
 * Chatbot configuration for integrating with external APIs
 */
export const CHATBOT_CONFIG = {
  // Default to false, set to true when using external APIs
  USE_EXTERNAL_API: false,
  
  // External API configuration (example for OpenAI)
  OPENAI: {
    API_URL: 'https://api.openai.com/v1/chat/completions',
    MODEL: 'gpt-3.5-turbo',
    // API key should be set in environment variables
    getHeaders: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    })
  }
};

/**
 * Handle API errors and return a user-friendly message
 * @param {Error} error - The error object from API call
 * @returns {string} User-friendly error message
 */
export const getErrorMessage = (error) => {
  if (error.response) {
    // Server responded with non-2xx status
    if (error.response.status === 404) {
      return 'The requested resource was not found. Please check the API endpoint.';
    } else if (error.response.status === 401 || error.response.status === 403) {
      return 'Authentication error. Please log in again.';
    } else if (error.response.status >= 500) {
      return 'Server error. Please try again later.';
    }
    return `Error ${error.response.status}: ${error.response.statusText || 'Unknown error'}`;
  } else if (error.request) {
    // Request was made but no response received
    return 'Network error. Please check your internet connection.';
  } else {
    // Something else happened while setting up the request
    return 'An unexpected error occurred. Please try again.';
  }
}; 