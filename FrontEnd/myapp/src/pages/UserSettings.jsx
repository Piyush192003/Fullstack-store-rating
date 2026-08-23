/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import api from "../utils/api";
import { applyTheme, currentThemePref } from "../utils/theme";

const ORIGIN = api.defaults.baseURL.replace(/\/api\/?$/, "");
const DEFAULT_NOTIF = { replies: true, likes: true, storeUpdates: false, nearby: true, email: true, push: true };

function Toggle({ on, onChange, label, hint }) {
  return <div className="set-row"><div><span className="t">{label}</span>{hint && <span className="h">{hint}</span>}</div><button type="button" className={`tgl${on ? " on" : ""}`} aria-pressed={on} onClick={() => onChange(!on)} /></div>;
}

export default function UserSettings() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [me, setMe] = useState(null);
  const [msg, setMsg] = useState(""); const [err, setErr] = useState("");
  const [acc, setAcc] = useState({ name: "", email: "", phone: "", address: "", dateOfBirth: "" });
  const [pw, setPw] = useState({ password: "", confirm: "" });
  const [delPw, setDelPw] = useState(""); const [deleting, setDeleting] = useState(false);
  const [savingAcc, setSavingAcc] = useState(false); const [savingPw, setSavingPw] = useState(false); const [uploading, setUploading] = useState(false);
  const [notif, setNotif] = useState(DEFAULT_NOTIF);
  const [loc, setLoc] = useState({ city: "", unit: "km", coords: null, permission: "" });
  const [themePref, setThemePref] = useState(currentThemePref());
  const [prefs, setPrefs] = useState({ defaultCategory: "", defaultSort: "name", language: "en" });
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api.get("/auth/me").then((r) => {
      const u = r.data.user; setMe(u);
      setAcc({ name: u.name || "", email: u.email || "", phone: u.phone || "", address: u.address || "", dateOfBirth: u.dateOfBirth ? String(u.dateOfBirth).slice(0, 10) : "" });
      const s = u.settings || {};
      setNotif({ ...DEFAULT_NOTIF, ...(s.notif || {}) });
      setLoc({ city: (s.location && s.location.city) || "", unit: (s.location && s.location.unit) || "km", coords: (s.location && s.location.coords) || null, permission: "" });
      setPrefs({ defaultCategory: (s.preferences && s.preferences.defaultCategory) || "", defaultSort: (s.preferences && s.preferences.defaultSort) || "name", language: (s.preferences && s.preferences.language) || "en" });
    }).catch((e) => setErr(e.response?.data?.message || "Could not load your settings."));
    api.get("/categories").then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(""), 2500); };
  const saveSettings = async (partial) => {
    setErr(""); setMsg("");
    try { const r = await api.put("/auth/me", { settings: partial }); setMe((m) => ({ ...(m || {}), settings: r.data.user.settings })); setMsg(r.data.message); setTimeout(() => setMsg(""), 2500); return true; }
    catch (e) { setErr(e.response?.data?.message || "Could not save settings."); return false; }
  };

  const accUpdate = (e) => setAcc({ ...acc, [e.target.name]: e.target.value });

  const saveAccount = async (event) => {
    event.preventDefault(); setErr(""); setMsg("");
    if (!acc.name.trim()) return setErr("Name cannot be empty.");
    setSavingAcc(true);
    try { const r = await api.put("/auth/me", { name: acc.name, email: acc.email, phone: acc.phone, address: acc.address, dateOfBirth: acc.dateOfBirth || null }); setAcc((a) => ({ ...a, email: r.data.user.email })); flash("Account details saved."); }
    catch (e) { setErr(e.response?.data?.errors?.[0]?.msg || e.response?.data?.message || "Could not save account details."); }
    finally { setSavingAcc(false); }
  };

  const savePassword = async (event) => {
    event.preventDefault(); setErr(""); setMsg("");
    if (pw.password.length < 4) return setErr("Password must be at least 4 characters.");
    if (pw.password !== pw.confirm) return setErr("Passwords do not match.");
    setSavingPw(true);
    try { const r = await api.post("/auth/change-password", { password: pw.password }); flash(r.data.message); setPw({ password: "", confirm: "" }); }
    catch (e) { setErr(e.response?.data?.message || "Could not update password."); }
    finally { setSavingPw(false); }
  };

  const pickPhoto = () => fileRef.current && fileRef.current.click();
  const onPhoto = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    setUploading(true); setErr(""); setMsg("");
    const fd = new FormData(); fd.append("photo", file);
    try { const r = await api.post("/auth/me/photo", fd, { headers: { "Content-Type": "multipart/form-data" } }); setMe((m) => ({ ...(m || {}), profilePhoto: r.data.profilePhoto })); flash(r.data.message); }
    catch (e2) { setErr(e2.response?.data?.message || "Upload failed."); }
    finally { setUploading(false); event.target.value = ""; }
  };
  const removePhoto = async () => { try { await api.put("/auth/me", { profilePhoto: null }); } catch {}; setMe((m) => ({ ...(m || {}), profilePhoto: null })); flash("Photo removed."); };

  const toggleNotif = (key) => { const next = { ...notif, [key]: !notif[key] }; setNotif(next); saveSettings({ notif: next }); };
  const locateMe = () => {
    if (!navigator.geolocation) return setErr("Geolocation is not supported by this browser.");
    navigator.geolocation.getCurrentPosition(
      (pos) => { const coords = { lat: Number(pos.coords.latitude.toFixed(6)), lng: Number(pos.coords.longitude.toFixed(6)) }; setLoc((l) => ({ ...l, coords, permission: "granted" })); saveSettings({ location: { ...loc, coords } }).then(() => flash("Current location saved.")); },
      (gerr) => { setLoc((l) => ({ ...l, permission: gerr.code === 1 ? "denied" : "unavailable" })); setErr(gerr.code === 1 ? "Location permission denied by browser." : "Could not get your location."); },
      { timeout: 8000 }
    );
  };
  const saveLocationField = (partial) => { const next = { ...loc, ...partial }; setLoc(next); saveSettings({ location: { city: next.city, unit: next.unit, coords: next.coords } }); };
  const changeTheme = (pref) => { setThemePref(pref); applyTheme(pref); saveSettings({ appearance: { theme: pref } }).then(() => flash("Appearance updated.")); };
  const savePrefs = (partial) => { const next = { ...prefs, ...partial }; setPrefs(next); saveSettings({ preferences: next }); };
  const logoutAll = async () => {
    try { const r = await api.post("/auth/sessions/logout-all"); localStorage.setItem("token", r.data.token); flash(r.data.message); }
    catch (e) { setErr(e.response?.data?.message || "Could not sign out other devices."); }
  };
  const downloadData = async () => {
    try { const r = await api.get("/auth/me/data", { responseType: "blob" }); const url = URL.createObjectURL(r.data); const a = document.createElement("a"); a.href = url; a.download = "storescope-my-data.json"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }
    catch (e) { setErr("Could not export your data."); }
  };
  const deleteAccount = async (event) => {
    event.preventDefault(); setErr(""); setMsg("");
    if (!window.confirm("Permanently delete your account, reviews and favorites? This cannot be undone.")) return;
    setDeleting(true);
    try { const r = await api.delete("/auth/me", { data: { password: delPw } }); window.alert(r.data.message); localStorage.clear(); navigate("/"); }
    catch (e) { setErr(e.response?.data?.message || "Could not delete account."); }
    finally { setDeleting(false); }
  };

  const signOutProxy = () => { localStorage.clear(); navigate("/"); };

  return <AppShell role="user" active="settings" title="Settings" subtitle="Manage your account, privacy, notifications and experience.">
    {msg && <p className="notice success">{msg}</p>}
    {err && <p className="notice error">{err}</p>}
    <div className="settings-grid">
      <section className="section"><div className="section-title"><div><h2>1. Account</h2><p className="muted">Your public identity on StoreScope.</p></div></div>
        <div className="avatar-edit">
          <div className="avatar-lg">{me && me.profilePhoto ? <img src={`${ORIGIN}${me.profilePhoto}`} alt="Profile" /> : (acc.name[0] || "U").toUpperCase()}</div>
          <div><button type="button" className="secondary-btn" onClick={pickPhoto} disabled={uploading}>{uploading ? "Uploading…" : "Upload photo"}</button>{me && me.profilePhoto && <button type="button" className="danger-btn" style={{ marginLeft: 8 }} onClick={removePhoto}>Remove</button>}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhoto} /><p className="muted" style={{ margin: "6px 0 0", fontSize: 12 }}>JPG, PNG or WEBP · max 5 MB</p></div>
        </div>
        <form onSubmit={saveAccount}>
          <label className="field">Full name<input name="name" value={acc.name} onChange={accUpdate} required maxLength="60" /></label>
          <label className="field">Email<input name="email" type="email" value={acc.email} onChange={accUpdate} /></label>
          <label className="field">Phone number<input name="phone" value={acc.phone} onChange={accUpdate} maxLength="40" placeholder="e.g. +91 98765 43210" /></label>
          <label className="field">Date of birth <span className="muted">(optional)</span><input name="dateOfBirth" type="date" value={acc.dateOfBirth} onChange={accUpdate} /></label>
          <label className="field">Address<input name="address" value={acc.address} onChange={accUpdate} placeholder="Used for Nearby Stores" /></label>
          <button className="primary-btn full" disabled={savingAcc}>{savingAcc ? "Saving…" : "Save account details"}</button>
        </form>
        <hr />
        <form onSubmit={savePassword}>
          <h3>Change password</h3>
          <label className="field">New password<input type="password" minLength="4" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} required /></label>
          <label className="field">Confirm new password<input type="password" minLength="4" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required /></label>
          <button className="secondary-btn full" disabled={savingPw}>{savingPw ? "Updating…" : "Update password"}</button>
        </form>
      </section>
      <section className="section"><div className="section-title"><div><h2>2. Privacy &amp; Security</h2><p className="muted">Control your sessions and your data.</p></div></div>
        <div className="set-row"><div><span className="t">Two-factor authentication</span><span className="h">Extra code step at login (coming soon)</span></div><button type="button" className="tgl" title="Coming soon" /></div>
        <div className="set-row"><div><span className="t">Active sessions</span><span className="h">You are signed in on this device.</span></div><button type="button" className="secondary-btn" onClick={logoutAll}>Sign out other devices</button></div>
        <div className="set-row"><div><span className="t">Download my data</span><span className="h">JSON copy of your profile, reviews and favorites.</span></div><button type="button" className="secondary-btn" onClick={downloadData}>Export</button></div>
      </section>

      <section className="section"><div className="section-title"><div><h2>3. Notifications</h2><p className="muted">Choose what you want to hear about.</p></div></div>
        <Toggle on={notif.replies} label="Review replies" hint="When a store responds to your review" onChange={(v) => toggleNotif("replies")} />
        <Toggle on={notif.likes} label="Review likes" hint="When someone marks your review helpful" onChange={(v) => toggleNotif("likes")} />
        <Toggle on={notif.storeUpdates} label="Store updates" hint="Approvals and status of your store" onChange={(v) => toggleNotif("storeUpdates")} />
        <Toggle on={notif.nearby} label="Nearby stores" hint="New stores in your saved area" onChange={(v) => toggleNotif("nearby")} />
        <Toggle on={notif.email} label="Email notifications" onChange={(v) => toggleNotif("email")} />
        <Toggle on={notif.push} label="Push notifications" hint="Browser push alerts (coming soon)" onChange={(v) => toggleNotif("push")} />
      </section>

      <section className="section"><div className="section-title"><div><h2>4. Location</h2><p className="muted">Powers the Nearby Stores experience.</p></div></div>
        <div className="set-row"><div><span className="t">Use current location</span><span className="h">{loc.coords ? `Saved: ${loc.coords.lat}, ${loc.coords.lng}` : loc.permission === "denied" ? "Permission denied by browser." : "Detect my position once and save it."}</span></div><button type="button" className="secondary-btn" onClick={locateMe}>{loc.coords ? "Re-detect" : "Detect location"}</button></div>
        <div className="set-row"><div><span className="t">Location permission</span><span className="h">{loc.permission || "Ask browser when detecting."}</span></div><button type="button" className="secondary-btn" onClick={() => saveLocationField({ permission: "" })}>Reset status</button></div>
        <label className="field">Default city / location<input value={loc.city} onChange={(e) => setLoc({ ...loc, city: e.target.value })} onBlur={() => saveLocationField({ city: loc.city })} placeholder="e.g. Pune" /></label>
        <div className="set-row"><div><span className="t">Distance unit</span></div><div className="seg">{[["km", "km"], ["mi", "miles"]].map(([v, l]) => <button key={v} type="button" className={loc.unit === v ? "on" : ""} onClick={() => saveLocationField({ unit: v })}>{l}</button>)}</div></div>
      </section>

      <section className="section"><div className="section-title"><div><h2>5. Appearance</h2><p className="muted">Pick how StoreScope looks to you.</p></div></div>
        <div className="seg">{[["light", "☀️ Light"], ["dark", "🌙 Dark"], ["system", "🖥 System default"]].map(([v, l]) => <button key={v} type="button" className={themePref === v ? "on" : ""} onClick={() => changeTheme(v)}>{l}</button>)}</div>
      </section>

      <section className="section"><div className="section-title"><div><h2>6. Preferences</h2><p className="muted">Defaults applied to Discover Stores.</p></div></div>
        <label className="field">Default store category<select value={prefs.defaultCategory} onChange={(e) => savePrefs({ defaultCategory: e.target.value })}><option value="">All categories</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="field">Default sorting<select value={prefs.defaultSort} onChange={(e) => savePrefs({ defaultSort: e.target.value })}><option value="name">Name A–Z</option><option value="-name">Name Z–A</option><option value="ratingDesc">Highest rated</option><option value="ratingAsc">Lowest rated</option></select></label>
        <label className="field">Language<select value={prefs.language} onChange={(e) => savePrefs({ language: e.target.value })}><option value="en">English</option><option value="hi">हिन्दी (coming soon)</option><option value="mr">मराठी (coming soon)</option></select></label>
      </section>

      <section className="section danger-zone"><div className="section-title"><div><h2>7. Account actions</h2><p className="muted">Careful — these actions are permanent.</p></div></div>
        <div className="set-row"><div><span className="t">Log out</span><span className="h">Sign out of this device only.</span></div><button type="button" className="secondary-btn" onClick={signOutProxy}>Log out</button></div>
        <form onSubmit={deleteAccount}>
          <label className="field" style={{ marginTop: 12 }}>Confirm with your password<input type="password" value={delPw} onChange={(e) => setDelPw(e.target.value)} placeholder="Your password" /></label>
          <button className="danger-btn full" disabled={deleting || !delPw}>{deleting ? "Deleting…" : "Delete my account permanently"}</button>
        </form>
      </section>
    </div>
  </AppShell>;
}
