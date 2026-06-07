import axios from "axios";

// Create a new axios instance with your base URL mapping
const instance = axios.create({
  baseURL: "http://localhost:8000", // Django backend root URL
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to attach your Token dynamically on EVERY call
instance.interceptors.request.use(
  function (config) {
    // 1. Pull the absolute fresh token value straight from the local storage disk
    const authToken = localStorage.getItem("authToken");

    // 2. Inject it directly into this specific outbound request's header map
    // This stops the timing race condition on your dashboard components
    if (authToken) {
      config.headers["Authorization"] = `Token ${authToken}`;
      console.log("Successfully injected dynamic Authorization Token header.");
    } else {
      console.log(
        "No auth token found in storage - executing request as Guest.",
      );
    }

    // Log request details for debugging
    console.log(
      `${config.method.toUpperCase()} Request to: ${config.baseURL}${config.url}`,
    );
    return config;
  },
  function (error) {
    console.error("Request setup error tracing:", error);
    return Promise.reject(error);
  },
);

// Add a response interceptor to smoothly catch authentication roadblocks
instance.interceptors.response.use(
  function (response) {
    console.log(`Successful Response from ${response.config.url}`);
    return response;
  },
  function (error) {
    console.error("Response processing error:", error);

    // If a secure endpoint returns 401 Unauthorized, wipe local data
    if (error.response && error.response.status === 401) {
      console.log(
        "Unauthorized context detected - clearing expired token data strings",
      );
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");

      // Only force a redirect refresh if the user isn't already trying to log in!
      if (window.location.pathname !== "/login") {
        console.log("Forcing route safety escape kickout back to login.");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

export default instance;
