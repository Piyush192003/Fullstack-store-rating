/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../utils/api";
import { applyTheme } from "../utils/theme";

export default function AppShell({ role, active = "", title, subtitle, children, topbarCenter }) {
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Apply the saved theme on every screen
  useEffect(() => { applyTheme(); }, []);
  const paths = { admin: "/admin/dashboard", owner: "/owner/dashboard", user: "/user/dashboard" };
  const profilePath = `${paths[role].replace(/\/dashboard$/, "")}/profile`;
  const settingsPath = role === "user" ? "/user/settings" : `${profilePath}#security`;
  const signOut = () => { localStorage.clear(); navigate("/"); };

  // Unread notification badge (user panel only)
  useEffect(() => {
    if (role !== "user") return;
    api.get("/user/notifications").then((r) => setUnread(r.data.unread)).catch(() => {});
  }, [role]);

  // Close the account dropdown when clicking outside / pressing Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [menuOpen]);

  // ---------- USER sidebar: Workspace only (account lives in the topbar) ----------
  if (role === "user") {
    const workspace = [
      ["discover", "🏪", "Discover Stores"],
      ["nearby", "📍", "Nearby Stores"],
      ["myreviews", "⭐", "My Ratings & Reviews"],
      ["favorites", "❤️", "Favorites"],
      ["notifications", "🔔", "Notifications"]
    ];
    const goUser = (key) => {
      if (key === "discover") navigate(paths.user);
      else navigate(`/user/${key === "myreviews" ? "my-reviews" : key}`);
    };
    return <div className="app-shell">
      <header className="topbar"><div className="brand"><span className="brand-mark">S</span>StoreScope</div>
        {topbarCenter && <div className="topbar-tools">{topbarCenter}</div>}
        <div className="topbar-right">
          {role === "user" && <button type="button" className="bell-btn" title="Notifications" onClick={() => navigate("/user/notifications")}>🔔{unread > 0 && <span className="bell-badge">{unread}</span>}</button>}
          <div className="user-menu" ref={menuRef}>
            <button className="profile-trigger" onClick={() => setMenuOpen((o) => !o)} title="Account menu"><div className="avatar">{role[0].toUpperCase()}</div><span className="hide-mobile">user</span><span className={`chev${menuOpen ? " up" : ""}`}>▾</span></button>
            {menuOpen && <div className="dropdown">
              <button onClick={() => { setMenuOpen(false); navigate(profilePath); }}>👤<span>My Profile</span></button>
              <button onClick={() => { setMenuOpen(false); navigate(settingsPath); }}>⚙️<span>Settings</span></button>
              <div className="dd-sep" />
              <button className="danger" onClick={signOut}>🚪<span>Logout</span></button>
            </div>}
          </div>
        </div>
      </header>
      <div className="layout"><aside className="sidebar">
        <div className="side-label">Workspace</div>
        {workspace.map(([key, ico, label]) => <button key={key} className={`nav-item ${active === key ? "active" : ""}`} onClick={() => goUser(key)}>{ico}<span>{label}</span></button>)}
      </aside>
      <main className="content"><div className="page-heading"><div><p className="eyebrow">user workspace</p><h1>{title}</h1><p>{subtitle}</p></div></div>{children}</main>
      </div>
    </div>;
  }

  // ---------- ADMIN / OWNER sidebar ----------
  const loc = useLocation();
  const items = role === "admin"
    ? [["overview", "Overview"], ["users", "People & stores"]]
    : [["overview", "Store overview"]];
  const activeKey = (() => {
    if (active) return active;
    const h = loc.hash ? loc.hash.slice(1) : "";
    if (loc.pathname !== paths[role] || !h) return "overview";
    if (items.some(([k]) => k === h)) return h;
    // Any admin management tab (#stores, #pending, …) keeps "People & stores" highlighted
    return role === "admin" ? "users" : "overview";
  })();
  const goLegacy = (key) => key === "overview" ? navigate(paths[role]) : navigate(`${paths[role]}#${key}`);
  return <div className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">S</span>StoreScope</div>
      <div className="user-menu" ref={menuRef}>
        <button className="profile-trigger" onClick={() => setMenuOpen((o) => !o)} title="Account menu"><div className="avatar">{role[0].toUpperCase()}</div><span className="hide-mobile">{role === "owner" ? "Store owner" : role}</span><span className={`chev${menuOpen ? " up" : ""}`}>▾</span></button>
        {menuOpen && <div className="dropdown">
          <button onClick={() => { setMenuOpen(false); navigate(profilePath); }}>👤<span>My Account</span></button>
          <button onClick={() => { setMenuOpen(false); navigate(settingsPath); }}>⚙️<span>Settings</span></button>
          <div className="dd-sep" />
          <button className="danger" onClick={signOut}>🚪<span>Logout</span></button>
        </div>}
      </div>
    </header>
    <div className="layout"><aside className="sidebar"><div className="side-label">Workspace</div>{items.map(([key,label]) => <button key={key} className={`nav-item ${activeKey === key ? "active" : ""}`} onClick={() => goLegacy(key)}>{label}</button>)}</aside>
      <main className="content"><div className="page-heading"><div><p className="eyebrow">{role} workspace</p><h1>{title}</h1><p>{subtitle}</p></div></div>{children}</main>
    </div>
  </div>;
}