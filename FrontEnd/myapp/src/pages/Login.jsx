import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", {
        email,
        password,
      });

      const { user, token } = res.data;

      // Save token + identity
      localStorage.setItem("token", token);
      localStorage.setItem("role", user.role);
      localStorage.setItem("uid", String(user.id));
      localStorage.setItem("userName", user.name);

      // Redirect based on role
      if (user.role === "admin") navigate("/admin/dashboard");
      else if (user.role === "owner") navigate("/owner/dashboard");
      else navigate("/user/dashboard");

    } catch (err) {
      const validationError = err.response?.data?.errors?.[0]?.msg;
      setError(validationError || err.response?.data?.message || "Login failed");
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

        <p className="muted" style={{ marginTop: 20 }}>
          Don't have an account?{" "}
          <Link to="/register" className="form-link">Create an account</Link>
        </p>
      </form></main></div>
  );
}
