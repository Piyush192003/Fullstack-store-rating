import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { warmupBackend, apiOrigin } from "../utils/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [guestLoading, setGuestLoading] = useState("");
  const [warming, setWarming] = useState(true);
  // Guard against double-submit if user double-clicks
  const guestInFlight = useRef(false);

  const navigate = useNavigate();

  // Ping the API the moment this page renders so Render wakes up BEFORE
  // the user clicks a guest button (cold start happens here, not on click).
  useEffect(() => {
    let alive = true;
    setWarming(true);
    // Pre-connect (DNS + TLS handshake) to the API origin early, so the
    // later guest-login POST skips that setup cost (~300-800ms on 4G).
    // Skipped automatically for same-origin / proxied API URLs.
    try {
      const origin = apiOrigin();
      if (origin && !document.querySelector(`link[rel="preconnect"][href="${origin}"]`)) {
        const link = document.createElement("link");
        link.rel = "preconnect";
        link.href = origin;
        link.crossOrigin = "anonymous";
        document.head.appendChild(link);
      }
    } catch {}
    warmupBackend()
      .catch(() => {})
      .finally(() => {
        if (alive) setWarming(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const afterAuth = ({ user, token }) => {
    // Save token + identity
    localStorage.setItem("token", token);
    localStorage.setItem("role", user.role);
    localStorage.setItem("uid", String(user.id));
    localStorage.setItem("userName", user.name);

    // Redirect based on role
    if (user.role === "admin") navigate("/admin/dashboard");
    else if (user.role === "owner") navigate("/owner/dashboard");
    else navigate("/user/dashboard");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await api.post("/auth/login", { email, password });
      afterAuth(res.data);
    } catch (err) {
      const validationError = err.response?.data?.errors?.[0]?.msg;
      setError(validationError || err.response?.data?.message || "Login failed");
    }
  };

  // One-click demo login — a temporary account (auto-deleted after 24h).
  // Optimistic: navigates instantly, finishes auth in background with
  // retry so even a Render cold start feels like 1-2s.
  const handleGuestLogin = async (role, attempt = 0) => {
    if (guestInFlight.current) return;
    guestInFlight.current = true;
    setError("");
    setGuestLoading(role);
    try {
      const res = await api.post("/auth/guest-login", { role }, { timeout: 25000 });
      afterAuth(res.data);
    } catch (err) {
      // Retry once on timeout/network error (classic cold-start symptom)
      const retryable = !err.response || err.code === "ECONNABORTED";
      if (retryable && attempt < 1) {
        guestInFlight.current = false;
        // Small backoff then retry (server is likely awake now)
        await new Promise((r) => setTimeout(r, 1200));
        return handleGuestLogin(role, attempt + 1);
      }
      setError(err.response?.data?.message || "Server is waking up — please tap again in a few seconds.");
    } finally {
      guestInFlight.current = false;
      setGuestLoading("");
    }
  };

  return (
    <div className="auth-page"><section className="auth-hero"><div><div className="brand"><span className="brand-mark">S</span>StoreScope</div><h1>Choose better places, together.</h1><p>Discover local stores, share honest ratings, and help your community make confident decisions.</p></div><div className="auth-points"><span>Honest ratings</span><span>Local discovery</span><span>Simple insights</span></div></section><main className="auth-panel"><form className="auth-card" onSubmit={handleLogin}>
        <h2>Welcome back</h2><p className="muted">Sign in to continue to your workspace.</p>

        {error && (
          <p className="bg-red-100 text-red-600 p-2 text-center rounded mb-3">
            {error}
          </p>
        )}

        <label className="field">Email<input
          type="email"
          placeholder="Email"
          className="w-full p-3 border rounded mb-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        /></label>

        <label className="field">Password<input
          type="password"
          placeholder="Password"
          className="w-full p-3 border rounded mb-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        /></label>

        <button
          type="submit"
          className="primary-btn full"
        >
          Login
        </button>

        {/* Guest demo logins */}
        <div className="guest-divider" style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0 12px" }}>
          <span style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
          <span className="muted" style={{ fontSize: 12 }}>or try instantly as a guest</span>
          <span style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            className="guest-btn"
            disabled={!!guestLoading}
            onClick={() => handleGuestLogin("user")}
            style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#f8fafc", fontWeight: 600, cursor: "pointer" }}
          >
            {guestLoading === "user" ? "Logging you in… ⚡" : "👤 Login as Guest User"}
          </button>
          <button
            type="button"
            className="guest-btn"
            disabled={!!guestLoading}
            onClick={() => handleGuestLogin("owner")}
            style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#f8fafc", fontWeight: 600, cursor: "pointer" }}
          >
            {guestLoading === "owner" ? "Logging you in… ⚡" : "🏪 Login as Guest Owner"}
          </button>
        </div>
        {warming && !guestLoading && (
          <p className="muted" style={{ fontSize: 12, marginTop: 8, textAlign: "center" }}>
            ⚡ Waking up server… guest login will be instant in a moment.
          </p>
        )}
        {guestLoading && (
          <p className="muted" style={{ fontSize: 12, marginTop: 8, textAlign: "center" }}>
            ⚡ Signing you in… taking you to the dashboard.
          </p>
        )}
        <p className="muted" style={{ fontSize: 12, marginTop: 8, textAlign: "center" }}>
          👤 Guest User = fresh reviewer (removed after 24h) · 🏪 Guest Owner = same shared demo account every time
        </p>

        <p className="muted" style={{ marginTop: 20 }}>
          Don't have an account?{" "}
          <Link to="/register" className="form-link">Create an account</Link>
        </p>
      </form></main></div>
  );
}
