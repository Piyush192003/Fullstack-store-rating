import axios from "axios";

// API base URL:
// - Production: set VITE_API_URL to your Render API root, e.g. https://your-api.onrender.com/api
// - Local dev:  falls back to http://localhost:5000/api
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: 20000,
});

// Auto-add token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Warm up the backend (Render free tier sleeps when idle).
// Call once when the Login page mounts so that by the time the user clicks
// "Login as Guest", the server + Mongo pool are already hot.
// Cached: concurrent callers share one in-flight ping.
let warmupPromise = null;
export function warmupBackend() {
  if (warmupPromise) return warmupPromise;
  warmupPromise = api
    .get("/health", { timeout: 12000 })
    .catch(() => null)
    .finally(() => {
      // Allow a fresh ping after 60s (instance may sleep again)
      setTimeout(() => {
        warmupPromise = null;
      }, 60000);
    });
  return warmupPromise;
}

export default api;
