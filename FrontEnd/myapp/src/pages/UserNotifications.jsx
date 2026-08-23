/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import api from "../utils/api";

export default function UserNotifications() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = async () => { try { const r = await api.get("/user/notifications"); setItems(r.data.items); setUnread(r.data.unread); } catch {} finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const markAll = async () => { try { await api.post("/user/notifications/read-all"); load(); } catch {} };

  return <AppShell role="user" active="notifications" title="Notifications" subtitle="Updates about your reviews and favorite stores.">
    <div className="section-title" style={{ marginBottom: 12 }}><h2>{unread ? `${unread} unread` : "All caught up"}</h2>{unread > 0 && <button className="secondary-btn" onClick={markAll}>Mark all as read</button>}</div>
    {loading && <div className="empty">Loading notifications…</div>}
    {!loading && !items.length && <div className="empty">🎉 Nothing here yet. You’ll get notified when a store replies to one of your reviews.</div>}
    {!loading && items.map((n) => <div className={`notif-item${n.isRead ? "" : " unread"}`} key={n.id}><span className="notif-ico">🔔</span><div style={{ flex: 1 }}><strong>{n.title}</strong>{n.body && <p className="muted" style={{ margin: "4px 0 0" }}>{n.body}</p>}</div><small className="muted">{new Date(n.createdAt).toLocaleString()}</small></div>)}
  </AppShell>;
}
