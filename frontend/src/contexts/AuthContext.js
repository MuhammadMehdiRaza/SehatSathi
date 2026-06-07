import React, { createContext, useState, useEffect, useContext } from "react";
import axios from "../utils/axiosConfig";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Check if user is already logged in upon app mount/refresh
    const checkAuthStatus = async () => {
      try {
        const authToken = localStorage.getItem("authToken");
        console.log("Checking auth status. Token exists:", !!authToken);

        if (authToken) {
          // Explicitly set the authorization token headers for our Axios instance
          axios.defaults.headers.common["Authorization"] = `Token ${authToken}`;

          // Get the current user data from Django (added crucial trailing slash)
          const response = await axios.get("/api/current-user/");
          console.log("Current user response:", response.data);
          setCurrentUser(response.data);
        } else {
          setCurrentUser(null);
        }
      } catch (error) {
        console.log("User not logged in or token is expired:", error);
        setCurrentUser(null);

        // Clear any broken/expired token out of local storage
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        delete axios.defaults.headers.common["Authorization"];
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (email, password) => {
    try {
      setError("");
      // Hit your clean custom token view (added crucial trailing slash)
      const response = await axios.post("/api/login/", { email, password });

      // 1. Extract the unique key token and user data object sent back from our backend view
      const { token, user } = response.data;

      // 2. Persist the database token string inside local browser storage
      localStorage.setItem("authToken", token);
      localStorage.setItem("user", JSON.stringify(user));

      // 3. Configure our default global Axios instance to use this Token header for all upcoming API hits
      axios.defaults.headers.common["Authorization"] = `Token ${token}`;

      // 4. Save the user payload inside our local React global context state tracker
      setCurrentUser(user);

      return response.data;
    } catch (error) {
      // Safely read the custom validation error message coming back from our views
      setError(error.response?.data?.message || "Login failed");
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      setError("");
      const response = await axios.post("/api/register/", userData);
      return response.data;
    } catch (error) {
      setError(error.response?.data?.message || "Registration failed");
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Send a request to the backend logout view if needed to record logs
      await axios.post("/api/logout/");
    } catch (error) {
      console.error("Logout error background tracing:", error);
    } finally {
      // Always wipe credentials cleanly out of the client app states
      setCurrentUser(null);
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");

      // Remove the Authorization header completely so future requests are clean
      delete axios.defaults.headers.common["Authorization"];
    }
  };

  const updateUserInfo = (userData) => {
    setCurrentUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const getAuthHeaders = () => {
    const authToken = localStorage.getItem("authToken");
    return {
      Authorization: authToken ? `Token ${authToken}` : "",
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
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
