import axios from "axios";

// API base URL — no dashboard env var needed:
// 1. VITE_API_URL when explicitly configured (local .env / dashboard).
//    The committed FrontEnd/myapp/.env contains localhost, so on a real
//    deployed host (non-localhost page) it is ignored → production fallback.
// 2. Same-origin "/api" via the Vercel rewrite proxy (no CORS at all).
//    vercel.json forwards /api/* → Render backend with headers preserved.
// 3. Direct Render URL fallback (if proxy is unavailable).
// 4. localhost (local dev only).
const RENDER_API = "https://store-rating-backend-gnuu.onrender.com/api";
const configuredRaw = (import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");
const isLocalhostPage =
  typeof window !== "undefined" &&
  /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
const configuredIsLocal =
  /^(https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?|\/api(\/.*)?)$/i.test(configuredRaw);

// Ignore a localhost VITE_API_URL when the page itself is NOT localhost
// (this is exactly the reported bug: committed .env shipped localhost to Vercel).
const configured =
  configuredRaw && (isLocalhostPage || !configuredIsLocal) ? configuredRaw : "";

const baseURL =
  configured ||
  (!isLocalhostPage ? "/api" : "http://localhost:5000/api");

const api = axios.create({
  baseURL,
  timeout: 20000,
});

// If the same-origin proxy fails (e.g. rewrite not yet live), retry once
// against the direct Render URL — self-heals without any user action.
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const cfg = err.config || {};
    const isProxy = typeof cfg.baseURL === "string" && cfg.baseURL.startsWith("/api");
    const retryable = isProxy && !cfg._proxyFallbackDone && (!err.response || err.response.status >= 500);
    if (retryable) {
      cfg._proxyFallbackDone = true;
      cfg.baseURL = RENDER_API;
      return api.request(cfg);
    }
    return Promise.reject(err);
  }
);

// Auto-add token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Pre-connect hint for the API origin (safe when baseURL is relative or
// same-origin — returns null so callers skip it).
export function apiOrigin() {
  try {
    const u = new URL(api.defaults.baseURL, window.location.href);
    if (u.origin === window.location.origin) return null; // same-origin — nothing to do
    return u.origin;
  } catch {
    return null; // relative URL (same-origin proxy) — nothing to preconnect to
  }
}

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
