import axios from "axios";

// API base URL:
// - Production: set VITE_API_URL to your Heroku API root, e.g. https://your-api.herokuapp.com/api
// - Local dev:  falls back to http://localhost:5000/api
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

// Auto-add token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
