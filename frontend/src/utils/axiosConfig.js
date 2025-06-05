import axios from 'axios';

// Function to get CSRF token from cookies
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// Create a new axios instance with a specific base URL
const instance = axios.create({
  baseURL: 'http://localhost:8000',  // Django backend URL
  withCredentials: true,  // Important for sending cookies with requests
  headers: {
    'Content-Type': 'application/json',
  }
});

// Set proper CSRF settings
instance.defaults.xsrfCookieName = 'csrftoken';
instance.defaults.xsrfHeaderName = 'X-CSRFToken';

// Request a CSRF token before starting the app
const fetchCsrfToken = async () => {
  try {
    // Make a GET request to a Django endpoint that will set the CSRF cookie
    await axios.get('http://localhost:8000/api-auth/login/', { withCredentials: true });
    console.log('CSRF token cookie has been set');
    return true;
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
    return false;
  }
};

// Call this on app initialization
fetchCsrfToken();

// Add a request interceptor to include CSRF token
instance.interceptors.request.use(function (config) {
  // For non-GET requests, add CSRF token manually
  if (config.method !== 'get') {
    const csrfToken = getCookie('csrftoken');
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
      console.log('Added CSRF token to request:', csrfToken.substring(0, 5) + '...');
    } else {
      console.warn('No CSRF token found in cookies - this might cause authentication issues');
      
      // Try to load the CSRF token
      fetchCsrfToken().then(success => {
        if (success) {
          console.log('Retrieved CSRF token, but too late for this request');
        }
      });
    }
  }
  
  // Check for authentication token
  const authToken = localStorage.getItem('authToken');
  
  // Add Authentication header - even with session auth, this helps to see if token exists
  if (authToken) {
    // For session-based auth, we don't add a real token but this helps debugging
    console.log('User has authentication token');
  } else {
    console.log('No auth token found');
  }
  
  // Log the request details for debugging
  console.log(`${config.method.toUpperCase()} Request to: ${config.baseURL}${config.url}`);
  return config;
}, function (error) {
  console.error('Request error:', error);
  return Promise.reject(error);
});

// Add a response interceptor for debugging
instance.interceptors.response.use(function (response) {
  // Log all responses for debugging
  console.log(`Response from ${response.config.url}:`, response);
  
  // Additional specific logging for patients endpoint
  if (response.config.url.includes('/patients/')) {
    console.log('Patients Response Headers:', response.headers);
    console.log('Patients Response Data:', response.data);
    console.log('Number of items returned:', Array.isArray(response.data) ? response.data.length : 'Not an array');
    
    // If it's an array with only one element, log it in detail
    if (Array.isArray(response.data) && response.data.length === 1) {
      console.log('Single patient details:', response.data[0]);
    }
  }
  return response;
}, function (error) {
  // Log error responses
  console.error('Response error:', error);
  
  // If we get 401 Unauthorized, clear the token and redirect to login
  if (error.response && error.response.status === 401) {
    console.log('Unauthorized response - clearing token');
    localStorage.removeItem('authToken');
    window.location = '/login';
  }
  
  return Promise.reject(error);
});

export default instance; 