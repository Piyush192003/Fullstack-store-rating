import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import api from "../utils/api";

// Shared account page used by the user, admin and owner roles.
export default function ProfilePage({ role, active }) {
  const shellActive = active || (role === "user" ? "profile" : "settings");
  const [profile, setProfile] = useState(null); const [password, setPassword] = useState("");
  const [message, setMessage] = useState(""); const [error, setError] = useState("");
  useEffect(() => { api.get("/auth/me").then((response) => setProfile(response.data.user)).catch((requestError) => setError(requestError.response?.data?.message || "Could not load your profile.")); }, []);
  useEffect(() => { if (window.location.hash === "#security") setTimeout(() => { const el = document.getElementById("account-security"); if (el) el.scrollIntoView({ behavior: "smooth" }); }, 250); }, []);
  const savePassword = async (event) => { event.preventDefault(); setMessage(""); setError(""); try { const response = await api.post("/auth/change-password", { password }); setMessage(response.data.message); setPassword(""); } catch (requestError) { setError(requestError.response?.data?.message || "Could not update password."); } };
  return <AppShell role={role} active={shellActive} title="My profile" subtitle="Review your account information and manage your security.">
    {error && <p className="notice error">{error}</p>}
    <section className="split"><div className="section"><div className="section-title"><div><h2>Profile details</h2><p className="muted">Information linked to your StoreScope account.</p></div></div>{profile ? <div><div className="list-item"><span>Full name</span><strong>{profile.name}</strong></div><div className="list-item"><span>Email</span><strong>{profile.email}</strong></div><div className="list-item"><span>Phone</span><strong>{profile.phone || "Not provided"}</strong></div><div className="list-item"><span>Address</span><strong>{profile.address || "Not provided"}</strong></div><div className="list-item"><span>Account type</span><span className={`badge ${profile.role}`}>{profile.role}</span></div><div className="list-item"><span>Member since</span><strong>{profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "—"}</strong></div></div> : <div className="empty">Loading your profile…</div>}</div>
      <div className="section password-form" id="account-security"><div className="section-title"><div><h2>Account security</h2><p className="muted">Set a new password for your account.</p></div></div><form onSubmit={savePassword}><label className="field">New password<input type="password" minLength="4" value={password} onChange={(event) => setPassword(event.target.value)} required /></label><button className="secondary-btn full">Update password</button>{message && <p className="notice success">{message}</p>}</form></div>
    </section>
  </AppShell>;
}